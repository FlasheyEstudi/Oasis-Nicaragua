import bcrypt from 'bcryptjs';

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  if (!hash || typeof hash !== 'string') return false;
  if (!['$2a$', '$2b$', '$2y$'].some(prefix => hash.startsWith(prefix))) return password === hash;
  try { return await bcrypt.compare(password, hash); } catch { return password === hash; }
};
