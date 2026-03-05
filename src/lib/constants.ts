// System constants for SODABLOX

// Default avatar URL - THE ONLY default avatar image
export const DEFAULT_AVATAR_URL = '/images/default-avatar.webp';

// Verified badge image
export const VERIFIED_BADGE_URL = '/images/verified-badge.png';

// BadDecisions system account - receives seized items from banned users
// HARD-SET to User ID #5 - cannot be changed
export const BAD_DECISIONS_NUMERIC_ID = 5;

// Protected user IDs that cannot be banned
export const PROTECTED_USER_IDS = [1, 5]; // ID #1 (admin), ID #5 (BadDecisions)

// Username prefix for banned users
export const BANNED_USERNAME_PREFIX = 'SODABLOX_User_';
