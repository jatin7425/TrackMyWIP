// Backup of current `redisClient.js` (deprecated/otp).
// This backup preserves the current warning thrower so it can be restored if needed.
export default async function getRedis() {
    throw new Error('Redis client (OTP) is deprecated: authentication now uses Google SSO. Remove OTP-related code.');
}
