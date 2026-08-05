import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WAITLIST_CATEGORIES = new Set(["braino", "macos", "braino-os", "studio", "hera", "everything"]);

function categoriesFromContext(context: unknown): string[] {
  if (typeof context !== "string") return [];
  const raw = context.startsWith("editorial-waitlist:")
    ? context.slice("editorial-waitlist:".length)
    : "";
  return raw.split(",").map((value) => value.trim()).filter((value) => WAITLIST_CATEGORIES.has(value));
}

function serializeCategories(categories: string[]) {
  return `editorial-waitlist:${categories.join(",")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, context, categories } = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "invalid_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const requestedCategories = Array.from(new Set([
      ...(Array.isArray(categories) ? categories : []),
      ...categoriesFromContext(context),
    ].filter((value): value is string => typeof value === "string" && WAITLIST_CATEGORIES.has(value))));
    const normalizedContext = requestedCategories.length ? serializeCategories(requestedCategories) : context ?? null;
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: normalizedEmail, context: normalizedContext });

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("waitlist")
          .select("context")
          .eq("email", normalizedEmail)
          .maybeSingle();
        const mergedCategories = Array.from(new Set([
          ...categoriesFromContext(existing?.context),
          ...requestedCategories,
        ]));
        if (mergedCategories.length) {
          const { error: updateError } = await supabase
            .from("waitlist")
            .update({ context: serializeCategories(mergedCategories) })
            .eq("email", normalizedEmail);
          if (updateError) throw updateError;
        }
        return new Response(
          JSON.stringify({ error: "already_on_waitlist", categories: mergedCategories }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const { count } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({ success: true, position: count ?? 1 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "server_error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
