import { NextRequest } from "next/server";

/**
 * Validasi Origin/Referer untuk mencegah CSRF pada semua mutasi.
 *
 * Strategi: bandingkan host dari Origin header dengan host request.
 * - Development: semua request dari localhost diizinkan.
 * - Production: origin harus cocok dengan APP_URL env atau host request.
 *
 * Ini cukup sebagai CSRF protection karena browser selalu menyertakan Origin
 * pada cross-origin request, dan SameSite=Lax pada cookie sudah memblokir
 * sebagian besar CSRF attack yang tidak menggunakan GET.
 */
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Mobile (Flutter) tidak mengirim Origin — izinkan jika ada Bearer token.
  const authorization = req.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return true;
  }

  // Tidak ada Origin sama sekali: hanya izinkan di development.
  if (!origin && !referer) {
    return process.env.NODE_ENV !== "production";
  }

  const appUrl = process.env.APP_URL;
  const sourceUrl = origin ?? referer ?? "";

  try {
    const sourceHost = new URL(sourceUrl).host;
    const requestHost = req.headers.get("host") ?? "";

    if (sourceHost === requestHost) return true;

    if (appUrl) {
      const appHost = new URL(appUrl).host;
      if (sourceHost === appHost) return true;
    }

    // Localhost selalu diizinkan saat development.
    if (
      process.env.NODE_ENV !== "production" &&
      (sourceHost.startsWith("localhost") || sourceHost.startsWith("127.0.0.1"))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
