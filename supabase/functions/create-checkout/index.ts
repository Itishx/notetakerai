import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth: get logged-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const polarApiKey = Deno.env.get("POLAR_API_KEY");
    const polarProductId = Deno.env.get("POLAR_PRODUCT_ID");

    if (!polarApiKey || !polarProductId) {
      return new Response(JSON.stringify({ error: "Polar not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { successUrl } = await req.json().catch(() => ({}));

    // Create Polar checkout session
    const checkoutRes = await fetch("https://api.polar.sh/v1/checkouts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${polarApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: polarProductId,
        customer_email: user.email,
        metadata: {
          supabase_user_id: user.id,
          email: user.email,
        },
        success_url: successUrl || "https://notetakerai.lovable.app/premium?success=true",
      }),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.text();
      console.error("Polar checkout error:", checkoutRes.status, err);
      return new Response(JSON.stringify({ error: "Failed to create checkout" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkout = await checkoutRes.json();
    return new Response(JSON.stringify({ url: checkout.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
