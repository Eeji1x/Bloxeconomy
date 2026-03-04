import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin (ID #1)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("numeric_id")
      .eq("user_id", user.id)
      .single();

    if (!callerProfile || callerProfile.numeric_id !== 1) {
      throw new Error("Only ID #1 can wipe database");
    }

    // Get protected user IDs (numeric_id 1 and 5)
    const { data: protectedProfiles } = await supabase
      .from("profiles")
      .select("user_id, numeric_id")
      .in("numeric_id", [1, 5]);

    const protectedUserIds = protectedProfiles?.map((p) => p.user_id) || [];

    // 1. Delete all resale listings
    await supabase.from("resale_listings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Delete all item serials
    await supabase.from("item_serials").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Delete all inventory
    await supabase.from("user_inventory").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4. Delete all trades
    await supabase.from("trades").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 5. Delete promocode redemptions
    await supabase.from("promocode_redemptions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 6. Delete friends
    await supabase.from("friends").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 7. Delete announcements
    await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 8. Delete promocodes
    await supabase.from("promocodes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 9. Delete catalog items
    await supabase.from("catalog_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 10. Delete non-protected user roles
    const { data: allRoles } = await supabase.from("user_roles").select("id, user_id");
    if (allRoles) {
      const toDelete = allRoles.filter((r) => !protectedUserIds.includes(r.user_id));
      for (const role of toDelete) {
        await supabase.from("user_roles").delete().eq("id", role.id);
      }
    }

    // 11. Get non-protected profiles and delete them + their auth users
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, numeric_id");

    const deletedUsers: string[] = [];
    const failedUsers: string[] = [];

    if (allProfiles) {
      const nonProtected = allProfiles.filter((p) => !protectedUserIds.includes(p.user_id));
      for (const p of nonProtected) {
        // Delete profile first
        await supabase.from("profiles").delete().eq("user_id", p.user_id);
        // Delete auth user (frees email/username)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(p.user_id);
        if (deleteError) {
          failedUsers.push(p.user_id);
        } else {
          deletedUsers.push(p.user_id);
        }
      }
    }

    // 12. Also clean up any orphaned auth users that don't have profiles
    // (from previous failed wipes where profile was deleted but auth user wasn't)
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authUsers?.users) {
      for (const authUser of authUsers.users) {
        if (!protectedUserIds.includes(authUser.id)) {
          // Check if this user still has a profile
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", authUser.id)
            .maybeSingle();
          
          if (!existingProfile) {
            // Orphaned auth user - delete it
            await supabase.auth.admin.deleteUser(authUser.id);
            deletedUsers.push(authUser.id);
          }
        }
      }
    }

    // 13. Reset protected profiles
    for (const uid of protectedUserIds) {
      await supabase
        .from("profiles")
        .update({
          emeralds: 0,
          avatar_data: {},
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
          last_daily_claim: null,
        })
        .eq("user_id", uid);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database wiped successfully. Auth users deleted. Usernames freed.",
        deleted_users: deletedUsers.length,
        failed_deletions: failedUsers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
