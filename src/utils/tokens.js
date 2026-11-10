import crypto from 'node:crypto';

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}
