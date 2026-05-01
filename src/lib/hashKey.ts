// Browser-side SHA-256 hex matching public.hash_key(text) in Postgres.
// Postgres applies: encode(digest(upper(btrim(value)), 'sha256'), 'hex')
// We mirror that exactly so client lookups match server-stored hashes.

export async function hashKey(value: string): Promise<string> {
  const normalized = value.trim().toUpperCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Build the masked prefix shown to admins after a key is generated.
// Matches the SQL update logic in the migration.
export function inviteKeyPrefix(key: string): string {
  // INV-XXXXX-XXXXX  →  "INV-XXXXX-•••••"
  return key.substring(0, 9) + '-•••••';
}

export function betaKeyPrefix(key: string): string {
  // BETA-XXXXX-XXXXX  →  "BETA-XXXXX-•••••"
  return key.substring(0, 10) + '-•••••';
}

export function tokenPrefix(token: string): string {
  return token.substring(0, 8) + '…';
}
