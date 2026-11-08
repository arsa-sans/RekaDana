import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { getBudgetVsActualReport } from "@/server/modules/reports.service";
import { ForbiddenState } from "@/components/ui/States";
import { BudgetSummary } from "@/components/ui/BudgetSummary";
import { formatRupiah } from "@/lib/utils";
import { FileBarChart2, TrendingDown, TrendingUp, Minus, Download, ClipboardList } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, users } from "@/server/db/schema";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

const ACTION_LABEL: Record<string, string> = {
  "budget_version.approved": "Menyetujui versi anggaran",
  "budget_version.rejected": "Menolak versi anggaran",
  "expense_request.approved": "Menyetujui permintaan pengeluaran",
  "expense_request.rejected": "Menolak permintaan pengeluaran",
  "payment.posted": "Mencatat pembayaran",
  "payment.reversed": "Membalik pembayaran",
  "evidence.uploaded": "Mengunggah bukti transaksi",
};

function labelAction(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

export default async function ReportsPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId, eventId } = await params;

  let access: Awaited<ReturnType<typeof requireEventAccess>>;
  try {
    access = await requireEventAccess(session.user.id, eventId);
  } catch {
    return <ForbiddenState />;
  }

  const { event, membership } = access;
  const isBendahara = membership.role === "bendahara";
  const report = await getBudgetVsActualReport(session.user.id, eventId);

  // Fetch recent audit logs for this organization
  const rawLogs = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      objectType: auditLogs.objectType,
      objectId: auditLogs.objectId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, event.organizationId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  // Resolve actor names
  const actorIds = [...new Set(rawLogs.map((r) => r.actorId).filter(Boolean))] as string[];
  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const actorRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, actorIds));
    for (const u of actorRows) actorMap.set(u.id, u.name);
  }

  const logsWithActors = rawLogs.map((r) => ({
    ...r,
    actorName: r.actorId ? (actorMap.get(r.actorId) ?? "Sistem") : "Sistem",
  }));

  const exportUrl = `/api/v1/events/${eventId}/reports/export-csv`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{event.name}</p>
          <h1 className="text-xl font-bold text-slate-900">Laporan Anggaran vs Realisasi</h1>
          {report.hasActiveBudget ? (
            <p className="text-sm text-slate-500">
              Berdasarkan Versi Anggaran #{report.activeBudgetVersionNumber} yang disetujui.
            </p>
          ) : (
            <p className="text-sm text-slate-500">Belum ada versi anggaran yang disetujui.</p>
          )}
        </div>

        {isBendahara && report.hasActiveBudget && (
          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            <Download size={15} />
            Ekspor CSV
          </a>
        )}
      </div>

      {!report.hasActiveBudget ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <FileBarChart2 className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-medium text-slate-700">Laporan belum tersedia</p>
          <p className="mt-1 text-sm text-slate-500">
            Laporan akan muncul setelah Bendahara menyetujui versi anggaran.
          </p>
        </div>
      ) : (
        <>
          <BudgetSummary
            approvedBudgetTotal={report.approvedBudgetTotal}
            actualNet={report.actualNet}
            openCommitments={report.openCommitments}
            remainingControlBudget={report.remainingControlBudget}
          />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-700">Rincian per Pos Anggaran</p>
            {report.itemsBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400">Tidak ada pos anggaran dalam versi ini.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-4 py-3 font-semibold text-slate-700">Nama Pos</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Kategori</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Anggaran</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Komitmen</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Realisasi</th>
                      <th className="px-4 py-3 font-semibold text-slate-700 text-right">Sisa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.itemsBreakdown.map((item) => {
                      const remaining = parseFloat(item.remaining);
                      return (
                        <tr key={item.budgetItemId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {item.category ?? <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                            {formatRupiah(item.budgetTotal)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-amber-700">
                            {formatRupiah(item.openCommitments)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                            {formatRupiah(item.actualNet)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={[
                                "inline-flex items-center gap-1 font-mono tabular-nums text-sm font-semibold",
                                remaining > 0
                                  ? "text-green-700"
                                  : remaining < 0
                                  ? "text-red-600"
                                  : "text-slate-500",
                              ].join(" ")}
                            >
                              {remaining > 0 ? (
                                <TrendingDown size={13} />
                              ) : remaining < 0 ? (
                                <TrendingUp size={13} />
                              ) : (
                                <Minus size={13} />
                              )}
                              {formatRupiah(Math.abs(remaining).toFixed(2))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Audit log section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-slate-500" />
          <p className="text-sm font-semibold text-slate-700">Histori Aktivitas</p>
        </div>

        {logsWithActors.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-slate-400">Belum ada aktivitas tercatat untuk organisasi ini.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {logsWithActors.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 size-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-indigo-700">
                    {log.actorName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{log.actorName}</span>
                    {" "}
                    <span className="text-slate-600">{labelAction(log.action)}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {log.objectType} &middot;{" "}
                    <time dateTime={log.createdAt.toISOString()}>
                      {log.createdAt.toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">Org ID: {orgId}</p>
    </div>
  );
}
