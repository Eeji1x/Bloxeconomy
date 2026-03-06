import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Look up the key
    const { data: keyRecord, error } = await supabase
      .from("invite_keys")
      .select("*")
      .eq("key", invite_key.trim().toUpperCase())
      .maybeSingle();

    if (error || !keyRecord) {
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid or already used invite key." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (keyRecord.is_used) {
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid or already used invite key." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user_id provided, mark key as used
    if (user_id) {
      const { error: updateError } = await supabase
        .from("invite_keys")
        .update({
          is_used: true,
          used_by: user_id,
          used_at: new Date().toISOString(),
        })
        .eq("id", keyRecord.id)
        .eq("is_used", false); // Prevent race conditions

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
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: "Server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
