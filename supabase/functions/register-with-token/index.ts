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
    const { token, username, password } = await req.json();

    if (!token || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof username !== "string" || username.length < 3 || username.length > 20) {
      return new Response(
        JSON.stringify({ success: false, message: "Username must be 3-20 characters." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return new Response(
        JSON.stringify({ success: false, message: "Username can only contain letters, numbers, and underscores." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, message: "Password must be at least 6 characters." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up the token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("registration_tokens")
      .select("*")
      .eq("token", token.trim())
      .maybeSingle();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid or expired registration link." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenRecord.is_used) {
      return new Response(
        JSON.stringify({ success: false, message: "This registration link has already been used." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: false, message: "Username already taken." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const email = `${username.toLowerCase()}@sodablox.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error("Auth creation error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: authError?.message || "Failed to create account." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: authData.user.id,
        username,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to create profile." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used (with race condition protection)
    const { error: updateError } = await supabase
      .from("registration_tokens")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        used_by: authData.user.id,
      })
      .eq("id", tokenRecord.id)
      .eq("is_used", false);

    if (updateError) {
      console.error("Token update error:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account created! You can now log in." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
