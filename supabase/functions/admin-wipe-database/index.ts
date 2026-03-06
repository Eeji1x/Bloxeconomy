import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProfileRow = {
  user_id: string;
  numeric_id: number;
  username: string;
};

const PROTECTED_NUMERIC_IDS = [1, 5];

const assertNoError = (error: { message: string } | null, context: string) => {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Backend environment is misconfigured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: callerProfile, error: callerError } = await supabase
      .from("profiles")
      .select("numeric_id")
      .eq("user_id", user.id)
      .maybeSingle();
    assertNoError(callerError, "Failed to verify caller");

    if (!callerProfile || callerProfile.numeric_id !== 1) {
      throw new Error("Only ID #1 can wipe database");
    }

    const { data: protectedProfiles, error: protectedError } = await supabase
      .from("profiles")
      .select("user_id, numeric_id, username")
      .in("numeric_id", PROTECTED_NUMERIC_IDS);
    assertNoError(protectedError, "Failed to load protected profiles");

    if (!protectedProfiles || protectedProfiles.length !== 2) {
      throw new Error("Protected accounts (ID 1 and ID 5) must exist before wipe");
    }

    const protectedUserIds = protectedProfiles.map((p) => p.user_id);

    const deleteAll = async (table: string) => {
      const { error } = await supabase.from(table).delete().not("id", "is", null);
      assertNoError(error, `Failed to clear ${table}`);
    };

    // Clear all related tables fully
    await deleteAll("resale_listings");
    await deleteAll("item_serials");
    await deleteAll("user_inventory");
    await deleteAll("trades");
    await deleteAll("promocode_redemptions");
    await deleteAll("friends");
    await deleteAll("announcements");
    await deleteAll("promocodes");
    await deleteAll("catalog_items");
    await deleteAll("invite_keys");

    // Remove non-protected roles
    const { data: allRoles, error: rolesReadError } = await supabase
      .from("user_roles")
      .select("id, user_id");
    assertNoError(rolesReadError, "Failed to read user roles");

    if (allRoles?.length) {
      for (const role of allRoles) {
        if (!protectedUserIds.includes(role.user_id)) {
          const { error } = await supabase.from("user_roles").delete().eq("id", role.id);
          assertNoError(error, "Failed deleting user role");
        }
      }
    }

    const { data: allProfiles, error: profilesReadError } = await supabase
      .from("profiles")
      .select("user_id, numeric_id, username");
    assertNoError(profilesReadError, "Failed to read profiles");

    const nonProtectedProfiles = (allProfiles || []).filter(
      (p: ProfileRow) => !protectedUserIds.includes(p.user_id)
    );

    const failedAuthDeletes: string[] = [];

    // Delete auth users first so usernames/emails are actually freed
    for (const p of nonProtectedProfiles) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(p.user_id);
      if (authDeleteError) {
        failedAuthDeletes.push(`${p.username} (${p.user_id})`);
        continue;
      }

      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", p.user_id);
      assertNoError(profileDeleteError, `Failed deleting profile ${p.user_id}`);
    }

    // Cleanup any orphan auth users left in auth table (except IDs 1 and 5)
    let page = 1;
    let done = false;
    while (!done) {
      const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      assertNoError(listError, "Failed to list auth users");

      const users = usersPage?.users ?? [];
      for (const authUser of users) {
        if (protectedUserIds.includes(authUser.id)) continue;

        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(authUser.id);
        if (authDeleteError) {
          failedAuthDeletes.push(`orphan (${authUser.id})`);
        }
      }

      done = users.length < 1000;
      page += 1;
    }

    if (failedAuthDeletes.length > 0) {
      throw new Error(
        `Reset incomplete: failed to delete ${failedAuthDeletes.length} auth users. ${failedAuthDeletes.slice(0, 10).join(", ")}`
      );
    }

    // Ensure protected accounts are reset and reserved IDs are correct
    for (const p of protectedProfiles) {
      const forcedNumericId = p.numeric_id === 1 ? 1 : 5;
      const { error } = await supabase
        .from("profiles")
        .update({
          numeric_id: forcedNumericId,
          emeralds: 0,
          avatar_data: {},
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
          last_daily_claim: null,
          is_online: false,
        })
        .eq("user_id", p.user_id);
      assertNoError(error, `Failed resetting protected account ${forcedNumericId}`);
    }

    // Reset sequence baseline (legacy/compatibility)
    const { error: seqError } = await supabase.rpc("reset_profiles_numeric_id_seq");
    assertNoError(seqError, "Failed to reset profile ID sequence");

    // Final integrity checks
    const { count: profileCount, error: profileCountError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    assertNoError(profileCountError, "Failed to verify profile count");

    if (profileCount !== 2) {
      throw new Error(`Reset incomplete: expected 2 profiles, found ${profileCount ?? 0}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Full clean reset complete. Only ID 1 and ID 5 remain.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
