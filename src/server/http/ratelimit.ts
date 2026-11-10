/**
 * Rate limiter in-memory untuk endpoint auth.
 *
 * Strategi sederhana: sliding window per IP.
 * - Dev: limit lebih longgar (tidak memblokir kerja).
 * - Prod: ketat.
 *
 * Di production dengan banyak instance, perlu diganti dengan
 * Redis-based limiter. Ini cukup untuk satu instance.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Bersihkan entry yang sudah expired setiap 5 menit.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 10 : 100,
  },
};

/**
 * Periksa apakah IP sudah melebihi batas.
 * Kembalikan `true` jika masih diizinkan, `false` jika diblokir.
 */
export function checkRateLimit(ip: string, type: keyof typeof DEFAULTS = "auth"): boolean {
  const config = DEFAULTS[type];
  const key = `${type}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (entry.count >= config.max) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Ambil IP pengguna dari request headers.
 * Prioritas: x-forwarded-for (proxy/CDN), x-real-ip, fallback "unknown".
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}
