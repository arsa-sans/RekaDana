import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proteksi CSRF berbasis Origin pada semua endpoint mutasi API
  if (pathname.startsWith("/api/v1")) {
    const method = req.method.toUpperCase();

    if (MUTATION_METHODS.has(method)) {
      const authHeader = req.headers.get("authorization");
      const isBearerToken = authHeader && authHeader.startsWith("Bearer ");

      // Klien mobile dan API publik menggunakan Bearer token yang kebal CSRF browser
      if (!isBearerToken) {
        const origin = req.headers.get("origin");
        const referer = req.headers.get("referer");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

        // Jika terdapat origin header (standar pada fetch browser), validasi kecocokan host
        if (origin && host) {
          try {
            const originUrl = new URL(origin);
            if (originUrl.host !== host) {
              return NextResponse.json(
                {
                  error: {
                    code: "CSRF_ORIGIN_MISMATCH",
                    message: "Akses ditolak. Asal permintaan (origin) tidak sesuai dengan host server.",
                  },
                },
                { status: 403 }
              );
            }
          } catch {
            return NextResponse.json(
              {
                error: {
                  code: "CSRF_INVALID_ORIGIN",
                  message: "Format header origin tidak valid.",
                },
              },
              { status: 403 }
            );
          }
        } else if (referer && host) {
          try {
            const refererUrl = new URL(referer);
            if (refererUrl.host !== host) {
              return NextResponse.json(
                {
                  error: {
                    code: "CSRF_ORIGIN_MISMATCH",
                    message: "Akses ditolak. Referer permintaan tidak sesuai dengan host server.",
                  },
                },
                { status: 403 }
              );
            }
          } catch {
            return NextResponse.json(
              {
                error: {
                  code: "CSRF_INVALID_ORIGIN",
                  message: "Format header referer tidak valid.",
                },
              },
              { status: 403 }
            );
          }
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
