import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  expenseRequests,
  payments,
  paymentReversals,
  users,
} from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { getBudgetVsActualReport } from "@/server/modules/reports.service";
import { apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

// Only Bendahara may export; exporting crosses tenant boundaries only if the event does not
// belong to a membership the user holds — requireEventAccess with the bendahara role enforces both.

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsv).join(",");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { eventId } = await params;

  let eventName: string;
  try {
    // bendahara role is required; cross-tenant access throws here too
    const { event } = await requireEventAccess(session.user.id, eventId, ["bendahara"]);
    eventName = event.name;
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({ code: err.code, message: err.message, status: err.statusCode });
    }
    return apiError({ code: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan internal.", status: 500 });
  }

  const report = await getBudgetVsActualReport(session.user.id, eventId);

  // Collect all expense requests with net payment amounts for the detail section
  const requests = await db
    .select({
      id: expenseRequests.id,
      title: expenseRequests.title,
      status: expenseRequests.status,
      requestedAmount: expenseRequests.requestedAmount,
      approvedAmount: expenseRequests.approvedAmount,
      requestedBy: expenseRequests.requestedBy,
      createdAt: expenseRequests.createdAt,
    })
    .from(expenseRequests)
    .where(eq(expenseRequests.eventId, eventId))
    .orderBy(expenseRequests.createdAt);

  // Resolve requester names
  const requesterIds = [...new Set(requests.map((r) => r.requestedBy).filter(Boolean))] as string[];
  const requesterMap = new Map<string, string>();
  if (requesterIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, requesterIds));
    for (const u of userRows) requesterMap.set(u.id, u.name);
  }

  // Calculate net paid per request
  const requestDetails: Array<{
    id: string;
    title: string;
    status: string;
    requestedAmount: string;
    approvedAmount: string | null;
    netPaid: string;
    requesterName: string;
    createdAt: Date;
  }> = [];

  for (const req of requests) {
    const reqPayments = await db
      .select({ id: payments.id, amount: payments.amount })
      .from(payments)
      .where(eq(payments.expenseRequestId, req.id));

    let netPaid = 0;
    for (const p of reqPayments) {
      const reversals = await db
        .select({ amount: paymentReversals.amount })
        .from(paymentReversals)
        .where(eq(paymentReversals.paymentId, p.id));
      const revSum = reversals.reduce((acc, r) => acc + parseFloat(r.amount), 0);
      netPaid += Math.max(0, parseFloat(p.amount) - revSum);
    }

    requestDetails.push({
      id: req.id,
      title: req.title,
      status: req.status,
      requestedAmount: req.requestedAmount,
      approvedAmount: req.approvedAmount,
      netPaid: netPaid.toFixed(2),
      requesterName: req.requestedBy ? (requesterMap.get(req.requestedBy) ?? "-") : "-",
      createdAt: req.createdAt,
    });
  }

  const lines: string[] = [];

  // Section 1: ringkasan
  lines.push(row("LAPORAN REALISASI ANGGARAN"));
  lines.push(row("Kegiatan", eventName));
  lines.push(row("Dibuat", new Date().toISOString()));
  lines.push("");
  lines.push(row("RINGKASAN"));
  lines.push(row("Total Anggaran Disetujui", report.approvedBudgetTotal));
  lines.push(row("Realisasi Bersih", report.actualNet));
  lines.push(row("Komitmen Terbuka", report.openCommitments));
  lines.push(row("Sisa Anggaran", report.remainingControlBudget));
  lines.push("");

  // Section 2: rincian per pos
  lines.push(row("RINCIAN PER POS ANGGARAN"));
  lines.push(row("Nama Pos", "Kategori", "Anggaran", "Realisasi", "Komitmen", "Sisa"));
  for (const item of report.itemsBreakdown) {
    lines.push(
      row(item.name, item.category ?? "", item.budgetTotal, item.actualNet, item.openCommitments, item.remaining)
    );
  }
  lines.push("");

  // Section 3: daftar pengeluaran
  lines.push(row("DAFTAR PERMINTAAN PENGELUARAN"));
  lines.push(row("Judul", "Pemohon", "Status", "Diminta", "Disetujui", "Dibayar Bersih", "Tanggal"));
  for (const req of requestDetails) {
    lines.push(
      row(
        req.title,
        req.requesterName,
        req.status,
        req.requestedAmount,
        req.approvedAmount ?? "",
        req.netPaid,
        req.createdAt.toISOString()
      )
    );
  }

  // Reconciliation check: total net paid across all requests must equal report actualNet
  const totalNetPaid = requestDetails.reduce((acc, r) => acc + parseFloat(r.netPaid), 0);
  lines.push("");
  lines.push(row("VALIDASI REKONSILIASI"));
  lines.push(row("Total Dibayar (dari detail)", totalNetPaid.toFixed(2)));
  lines.push(row("Total Realisasi (dari ringkasan)", report.actualNet));

  const safeEventName = eventName.replace(/[^a-zA-Z0-9\-_]/g, "-").slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `laporan-${safeEventName}-${dateStr}.csv`;

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
