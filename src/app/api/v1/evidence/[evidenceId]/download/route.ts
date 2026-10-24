import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { getEvidenceDownload } from "@/server/storage/evidence.service";
import { apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { evidenceId } = await params;

  try {
    const { evidence, fileBuffer, contentType } = await getEvidenceDownload(
      session.user.id,
      evidenceId
    );

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${evidence.originalFileName}"`,
        "Content-Length": evidence.fileSizeBytes.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({
        code: err.code,
        message: err.message,
        status: err.statusCode,
      });
    }
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal saat mengambil bukti fisik.",
      status: 500,
    });
  }
}
