import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return new Response(
        JSON.stringify({ valid: false, message: "Username is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return new Response(
        JSON.stringify({ valid: false, message: "Username must be 3-20 characters" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return new Response(
        JSON.stringify({ valid: false, message: "Username can only contain letters and numbers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (containsProfanity(username)) {
      const randomName = generateRandomUsername();
      return new Response(
        JSON.stringify({ valid: true, replaced: true, username: randomName, message: "Username contained inappropriate content and was replaced." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check uniqueness
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ valid: false, message: "Username already taken" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, message: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
