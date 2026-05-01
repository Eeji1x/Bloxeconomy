import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Match Postgres public.hash_key(text)
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
    const body = await req.json();
    const { action, token, username, password, application_id, short_id } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ── ACTION: generate-token (admin only) ──
    if (action === "generate-token") {
      if (!application_id || !username) {
        return new Response(
          JSON.stringify({ success: false, message: "Missing fields." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ success: false, message: "Unauthorized." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claims, error: claimsErr } = await callerClient.auth.getUser();
      if (claimsErr || !claims?.user) {
        return new Response(
          JSON.stringify({ success: false, message: "Unauthorized." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", claims.user.id)
        .in("role", ["admin", "owner"]);

      if (!roleData || roleData.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: "Unauthorized." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const bytes = new Uint8Array(48);
      crypto.getRandomValues(bytes);
      const secureToken = Array.from(bytes)
        .map((b) => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 64);

      const { error: insertErr } = await adminClient
        .from("registration_tokens")
        .insert({
          token: secureToken,
          application_id,
          username,
        });

      if (insertErr) {
        console.error("Token insert error:", insertErr);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to generate token." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, token: secureToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: lookup-status (check application status + registration link by short_id) ──
    if (action === "lookup-status") {
      if (!short_id) {
        return new Response(
          JSON.stringify({ success: false, message: "Missing application ID." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: app } = await adminClient
        .from("applications")
        .select("id, status, reject_reason, username")
        .eq("short_id", short_id.trim().toUpperCase())
        .maybeSingle();

      if (!app) {
        return new Response(
          JSON.stringify({ success: false, message: "Application not found." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result: any = {
        success: true,
        status: app.status,
        username: app.username,
        reject_reason: app.reject_reason,
      };

      // If accepted, look up the registration token
      if (app.status === "accepted") {
        const { data: tokenRecord } = await adminClient
          .from("registration_tokens")
          .select("token, is_used")
          .eq("application_id", app.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tokenRecord && !tokenRecord.is_used) {
          result.registration_token = tokenRecord.token;
        } else if (tokenRecord?.is_used) {
          result.token_used = true;
        }
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: validate (check if token is valid, no auth needed) ──
    if (action === "validate") {
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, valid: false, message: "No token." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: tokenRecord } = await adminClient
        .from("registration_tokens")
        .select("id, is_used")
        .eq("token", token.trim())
        .maybeSingle();

      if (!tokenRecord) {
        return new Response(
          JSON.stringify({ success: true, valid: false, message: "Invalid or expired registration link." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenRecord.is_used) {
        return new Response(
          JSON.stringify({ success: true, valid: false, message: "This registration link has already been used." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, valid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: register (create account with token, no auth needed) ──
    if (action === "register") {
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

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: tokenRecord, error: tokenError } = await adminClient
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

      // Atomically mark as used FIRST to prevent race conditions
      const { data: claimed, error: claimErr } = await adminClient
        .from("registration_tokens")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("id", tokenRecord.id)
        .eq("is_used", false)
        .select("id")
        .maybeSingle();

      if (claimErr || !claimed) {
        return new Response(
          JSON.stringify({ success: false, message: "This registration link has already been used." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check username not taken
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existingProfile) {
        await adminClient
          .from("registration_tokens")
          .update({ is_used: false, used_at: null })
          .eq("id", tokenRecord.id);
        return new Response(
          JSON.stringify({ success: false, message: "Username already taken." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user
      const email = `${username.toLowerCase()}@sodablox.local`;
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        await adminClient
          .from("registration_tokens")
          .update({ is_used: false, used_at: null })
          .eq("id", tokenRecord.id);
        return new Response(
          JSON.stringify({ success: false, message: authError?.message || "Failed to create account." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create profile
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({ user_id: authData.user.id, username });

      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        await adminClient
          .from("registration_tokens")
          .update({ is_used: false, used_at: null })
          .eq("id", tokenRecord.id);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to create profile." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Finalize token
      await adminClient
        .from("registration_tokens")
        .update({ used_by: authData.user.id })
        .eq("id", tokenRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: "Account created! You can now log in." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid action." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
