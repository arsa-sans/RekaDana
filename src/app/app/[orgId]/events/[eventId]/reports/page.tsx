import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { getBudgetVsActualReport } from "@/server/modules/reports.service";
import { ForbiddenState } from "@/components/ui/States";
import { BudgetSummary } from "@/components/ui/BudgetSummary";
import { formatRupiah } from "@/lib/utils";
import { FileBarChart2, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
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

  const { event } = access;
  const report = await getBudgetVsActualReport(session.user.id, eventId);

  return (
    <div className="flex flex-col gap-6">
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

          {/* Item breakdown table */}
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
    </div>
  );
}
