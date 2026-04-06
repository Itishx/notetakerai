import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Polar sends webhooks signed with HMAC-SHA256
async function verifyPolarSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = hexToBytes(signature);
  return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("webhook-signature") || req.headers.get("x-polar-signature") || "";
  const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Verify signature
  const isValid = await verifyPolarSignature(body, signature, webhookSecret);
  if (!isValid) {
    console.error("Invalid webhook signature");
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
  const customerEmail = subscription?.customer?.email || subscription?.metadata?.email;
  const supabaseUserId = subscription?.metadata?.supabase_user_id;

  async function findUserId(): Promise<string | null> {
    if (supabaseUserId) return supabaseUserId;
    if (customerEmail) {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", customerEmail)
        .maybeSingle();
      return data?.id || null;
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
        .eq("id", userId);
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
        .eq("id", userId);
      console.log(`Revoked premium for user ${userId}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
