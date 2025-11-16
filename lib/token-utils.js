// /api/lib/token-utils.js
import crypto from 'crypto';

const TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET || 'SET_ME';

export function generateToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}

export function hashToken(raw) {
  return crypto.createHmac('sha256', TOKEN_HASH_SECRET).update(raw).digest('hex');
}
