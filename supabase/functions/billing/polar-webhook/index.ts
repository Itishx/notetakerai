import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Polar signs webhooks with the Standard Webhooks spec:
// HMAC-SHA256 over "<webhook-id>.<webhook-timestamp>.<body>", base64, sent as "v1,<sig>".
// Polar uses the secret's raw UTF-8 bytes as the key ("whsec_" secrets are base64).
async function verifyPolarSignature(req: Request, body: string, secret: string): Promise<boolean> {
  const id = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const header = req.headers.get("webhook-signature");
  if (!id || !timestamp || !header) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const keyBytes = secret.startsWith("whsec_")
    ? Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))
    : new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  return header.split(" ").some((part) => {
    const sig = part.split(",")[1] || "";
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Every request must be signed by Polar. Unsigned requests could grant anyone premium.
  if (!(await verifyPolarSignature(req, body, webhookSecret))) {
    console.error("Invalid or missing webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const eventType = event.type;
  const subscription = event.data;

  console.log("Polar webhook:", eventType, subscription?.id);

  // Extract the user's email or metadata to find their Supabase user
  const customerEmail = subscription?.customer?.email || subscription?.user?.email || subscription?.metadata?.email;
  const supabaseUserId = subscription?.metadata?.supabase_user_id || subscription?.customer?.metadata?.supabase_user_id;

  async function findUserId(): Promise<string | null> {
    if (supabaseUserId) return supabaseUserId;
    if (customerEmail) {
      // Look up in auth.users via admin API (profiles table may not have email column)
      const { data, error } = await supabase.auth.admin.listUsers();
      if (!error && data?.users) {
        const match = data.users.find((u) => u.email === customerEmail);
        if (match) return match.id;
      }
    }
    return null;
  }

  if (
    eventType === "subscription.created" ||
    eventType === "subscription.updated" ||
    eventType === "subscription.active"
  ) {
    const isActive = subscription?.status === "active";
    const userId = await findUserId();

    if (userId) {
      await supabase
        .from("profiles")
        .update({
          is_premium: isActive,
          polar_customer_id: subscription?.customer_id || subscription?.customer?.id || null,
        })
        .eq("user_id", userId);
      console.log(`Set is_premium=${isActive} for user ${userId}`);
    } else {
      console.error("Could not find user for email:", customerEmail);
    }
  }

  if (
    eventType === "subscription.canceled" ||
    eventType === "subscription.revoked" ||
    eventType === "subscription.uncanceled" && subscription?.status !== "active"
  ) {
    const userId = await findUserId();
    if (userId) {
      await supabase
        .from("profiles")
        .update({ is_premium: false })
        .eq("user_id", userId);
      console.log(`Revoked premium for user ${userId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
