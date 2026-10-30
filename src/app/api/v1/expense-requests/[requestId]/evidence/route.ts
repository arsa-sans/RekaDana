import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { evidenceFiles, expenseRequests, events } from "@/server/db/schema";
import { requireMembership, AuthorizationError } from "@/server/authorization/tenant";
import { apiSuccess, apiError } from "@/server/http/response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { requestId } = await params;

  try {
    // Ambil organisasi dari jalur: expense_request -> event -> organization
    const [row] = await db
      .select({ organizationId: events.organizationId })
      .from(expenseRequests)
      .innerJoin(events, eq(expenseRequests.eventId, events.id))
      .where(eq(expenseRequests.id, requestId))
      .limit(1);

    if (!row) {
      return apiError({
        code: "EXPENSE_REQUEST_NOT_FOUND",
        message: "Permintaan pengeluaran tidak ditemukan.",
        status: 404,
      });
    }

    await requireMembership(session.user.id, row.organizationId);

    const items = await db
      .select({
        id: evidenceFiles.id,
        originalFileName: evidenceFiles.originalFileName,
        detectedFileType: evidenceFiles.detectedFileType,
        fileSizeBytes: evidenceFiles.fileSizeBytes,
        createdAt: evidenceFiles.createdAt,
      })
      .from(evidenceFiles)
      .where(eq(evidenceFiles.expenseRequestId, requestId))
      .orderBy(evidenceFiles.createdAt);

    return apiSuccess({ data: items });
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
      message: "Terjadi kesalahan internal saat mengambil daftar bukti.",
      status: 500,
    });
  }
}
