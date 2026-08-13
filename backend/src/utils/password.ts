import argon2 from 'argon2';

// Argon2id: resistant to both GPU cracking and side-channel attacks.
// Tuned for a reasonable balance of security and server cost.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // Malformed hash or verification error — treat as invalid, never throw to caller
    return false;
  }
}

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
};

export function passwordStrength(pw: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  if (pw.length < PASSWORD_REQUIREMENTS.minLength) issues.push('At least 8 characters');
  if (!/[a-z]/.test(pw)) issues.push('One lowercase letter');
  if (!/[A-Z]/.test(pw)) issues.push('One uppercase letter');
  if (!/[0-9]/.test(pw)) issues.push('One number');
  if (!/[^a-zA-Z0-9]/.test(pw)) issues.push('One special character');

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  return { score: Math.min(score, 4), issues };
}
