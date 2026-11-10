import { describe, expect, it } from 'vitest';
import {
  generateCsrfToken,
  generateRefreshToken,
  hashToken,
} from '../../src/utils/tokens.js';

describe('token utilities', () => {
  it('generates unique refresh tokens', () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(40);
  });

  it('hashes deterministically without exposing the token', () => {
    const token = generateRefreshToken();

    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(`${token}-other`)).not.toBe(hashToken(token));
  });

  it('generates CSRF tokens as hex strings', () => {
    const token = generateCsrfToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(generateCsrfToken()).not.toBe(token);
  });
});
