// Redis client removed: OTP flow deprecated in favor of Google SSO.
// This module intentionally throws to surface accidental usage of Redis-based OTP APIs.
export default async function getRedis() {
    throw new Error('Redis client (OTP) is deprecated: authentication now uses Google SSO. Remove OTP-related code.');
}
