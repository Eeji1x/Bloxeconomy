import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Profanity word list
const BLOCKED_WORDS = [
  "nigger", "nigga", "faggot", "fag", "retard", "retarded", "cunt", "kike",
  "spic", "chink", "gook", "wetback", "beaner", "tranny", "dyke", "twat",
  "whore", "slut", "bitch", "bastard", "cock", "dick", "pussy", "penis",
  "vagina", "anus", "anal", "cum", "semen", "porn", "hentai", "nazi",
  "hitler", "holocaust", "rape", "rapist", "molest", "pedophile", "pedo",
  "sex", "fuck", "shit", "ass", "damn", "hell", "crap",
  "negro", "darkie", "cracker", "honky", "redneck",
  "jihad", "terrorist", "suicide", "kill", "murder", "death",
];

function containsProfanity(username: string): boolean {
  const lower = username.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}

function generateRandomUsername(): string {
  const adjectives = ["Cool", "Swift", "Bold", "Brave", "Keen", "Wild", "Epic", "Rad", "Ace", "Slick"];
  const nouns = ["Player", "Gamer", "Hero", "Star", "Wolf", "Fox", "Hawk", "Tiger", "Bear", "Knight"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}${num}`;
}

function isValidUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 3 || username.length > 20) {
    return { valid: false, message: "Username must be 3-20 characters" };
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return { valid: false, message: "Username can only contain letters and numbers" };
  }
  if (containsProfanity(username)) {
    return { valid: false, message: "Username is not allowed.", replacement: generateRandomUsername() };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Not an admin");

    const { username, password, emeralds, customId } = await req.json();

    // Validate username
    const validation = isValidUsername(username);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check username uniqueness
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Username already taken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate custom ID
    if (customId !== undefined && customId !== null) {
      const numId = parseInt(customId);
      if (isNaN(numId) || numId < 1) {
        return new Response(
          JSON.stringify({ error: "Invalid ID" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (numId === 1 || numId === 5) {
        return new Response(
          JSON.stringify({ error: "ID 1 and 5 are reserved and cannot be used" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Check if ID is taken
      const { data: existingId } = await supabase
        .from("profiles")
        .select("id")
        .eq("numeric_id", numId)
        .maybeSingle();

      if (existingId) {
        return new Response(
          JSON.stringify({ error: "This ID is already in use." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create auth user
    const email = `${username.toLowerCase()}@sodablox.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create profile with custom ID if provided
    const profileData: any = {
      user_id: authData.user.id,
      username,
      emeralds: emeralds || 100,
    };

    if (customId) {
      profileData.numeric_id = parseInt(customId);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profileData);

    if (profileError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
