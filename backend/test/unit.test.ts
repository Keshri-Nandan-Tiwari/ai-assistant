import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, passwordStrength } from '../src/utils/password.js';
import { generateOpaqueToken, hashToken, signAccessToken, verifyAccessToken } from '../src/utils/tokens.js';

describe('password utils', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('CorrectHorse123');
    expect(hash).not.toBe('CorrectHorse123');
    expect(await verifyPassword(hash, 'CorrectHorse123')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('CorrectHorse123');
    expect(await verifyPassword(hash, 'WrongPassword')).toBe(false);
  });

  it('never throws on a malformed hash', async () => {
    await expect(verifyPassword('not-a-real-hash', 'anything')).resolves.toBe(false);
  });

  it('scores password strength correctly', () => {
    expect(passwordStrength('weak').score).toBeLessThan(2);
    expect(passwordStrength('Str0ng!Password').score).toBe(4);
  });
});

describe('token utils', () => {
  it('generates unique opaque tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(60);
  });

  it('hashes tokens deterministically (same input -> same hash)', () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('produces different hashes for different tokens', () => {
    expect(hashToken(generateOpaqueToken())).not.toBe(hashToken(generateOpaqueToken()));
  });

  it('signs and verifies a valid access token', () => {
    const token = signAccessToken('user-123', 'USER');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('USER');
    expect(payload.type).toBe('access');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken('user-123', 'USER');
    expect(() => verifyAccessToken(token + 'tampered')).toThrow();
  });
});
