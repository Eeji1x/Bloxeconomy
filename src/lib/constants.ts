// System constants for SODABLOX

// Default avatar URL
export const DEFAULT_AVATAR_URL = 'https://cartii.fit//images/thumbnails/93be22ddd8d6dae01870ad1dbdeae12aff93ff3981101f9b078c67ad2a78843f_thumbnail.png';

// BadDecisions system account - receives seized items from banned users
// HARD-SET to User ID #5 - cannot be changed
export const BAD_DECISIONS_NUMERIC_ID = 5;

// Protected user IDs that cannot be banned
export const PROTECTED_USER_IDS = [1, 5]; // ID #1 (admin), ID #5 (BadDecisions)

// Username prefix for banned users
export const BANNED_USERNAME_PREFIX = 'SODABLOX_User_';
