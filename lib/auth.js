import bcrypt from 'bcryptjs';

// Util password (bcrypt). Dipakai di route handler Node runtime & seed script.
export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
