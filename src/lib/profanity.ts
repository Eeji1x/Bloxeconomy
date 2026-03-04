// Profanity filter for usernames - client-side pre-check
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

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}

export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (username.length < 3 || username.length > 20) {
    return { valid: false, message: "Username must be 3-20 characters" };
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return { valid: false, message: "Username can only contain letters and numbers. No special characters or spaces." };
  }
  if (containsProfanity(username)) {
    return { valid: false, message: "Username is not allowed." };
  }
  return { valid: true };
}
