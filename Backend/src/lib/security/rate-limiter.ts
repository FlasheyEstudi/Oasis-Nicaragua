// OASIS - Rate Limiter & Security Shields
// In-memory rate limiter with sliding window, login-fail lockouts and periodic self-cleaning

interface LimitRecord {
  hits: number;
  resetTime: number;
}

// Cachés en memoria
const limitsMap = new Map<string, LimitRecord>();
const loginFailsMap = new Map<string, { count: number; lockedUntil: number }>();

// Limpieza periódica cada 5 minutos para evitar fugas de memoria
if (typeof global !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of limitsMap.entries()) {
      if (now > value.resetTime) limitsMap.delete(key);
    }
    for (const [key, value] of loginFailsMap.entries()) {
      if (now > value.lockedUntil && value.count >= 4) loginFailsMap.delete(key);
    }
  }, 5 * 60 * 1000).unref?.(); // unref para no bloquear el proceso de Node.js en tests
}

/**
 * Chequear límite de peticiones globales (IP o Usuario)
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = limitsMap.get(key);

  if (!record || now > record.resetTime) {
    const newRecord = { hits: 1, resetTime: now + windowMs };
    limitsMap.set(key, newRecord);
    return { success: true, limit, remaining: limit - 1, resetTime: newRecord.resetTime };
  }

  record.hits++;
  const remaining = Math.max(0, limit - record.hits);
  return {
    success: record.hits <= limit,
    limit,
    remaining,
    resetTime: record.resetTime
  };
}

/**
 * Gestionar y chequear bloqueos por intentos fallidos de login
 */
export function checkLoginLock(identityKey: string): { locked: boolean; lockedRemainingMs: number } {
  const now = Date.now();
  const record = loginFailsMap.get(identityKey);

  if (record && record.count >= 4 && now < record.lockedUntil) {
    return { locked: true, lockedRemainingMs: record.lockedUntil - now };
  }

  return { locked: false, lockedRemainingMs: 0 };
}

/**
 * Registrar un fallo de login
 */
export function recordLoginFail(identityKey: string) {
  const record = loginFailsMap.get(identityKey) || { count: 0, lockedUntil: 0 };
  record.count++;
  if (record.count >= 4) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // Bloqueo de 15 minutos
  }
  loginFailsMap.set(identityKey, record);
  return record;
}

/**
 * Limpiar fallos tras login exitoso
 */
export function resetLoginFails(identityKey: string) {
  loginFailsMap.delete(identityKey);
}
