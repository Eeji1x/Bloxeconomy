import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Match Postgres public.hash_key(text):
// encode(digest(upper(btrim(value)), 'sha256'), 'hex')
async function hashKey(value: string): Promise<string> {
  const normalized = value.trim().toUpperCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invite_key, user_id } = await req.json();

    if (!invite_key || typeof invite_key !== "string") {
      return new Response(
        JSON.stringify({ valid: false, message: "Invite key is required." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const key_hash = await hashKey(invite_key);

    const { data: keyRecord, error } = await supabase
      .from("invite_keys")
      .select("id, is_used")
      .eq("key_hash", key_hash)
      .maybeSingle();

    if (error || !keyRecord || keyRecord.is_used) {
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid or already used invite key." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user_id) {
      const { error: updateError } = await supabase
        .from("invite_keys")
        .update({
          is_used: true,
          used_by: user_id,
          used_at: new Date().toISOString(),
        })
        .eq("id", keyRecord.id)
        .eq("is_used", false);

      if (updateError) {
        return new Response(
          JSON.stringify({ valid: false, message: "Failed to redeem invite key." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ valid: false, message: "Server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
