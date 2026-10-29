import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { ForbiddenState, EmptyState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { db } from "@/server/db";
import { evidenceFiles } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { getExpenseRequestDetail } from "@/server/modules/expenses.service";
import { ExpenseActions } from "../ExpenseActions";
import { EvidenceSection } from "./EvidenceSection";
import { ArrowLeft, CreditCard, RotateCcw, CheckCircle2, AlertCircle, Clock, User, Tag } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ orgId: string; eventId: string; requestId: string }>;
}

export default async function ExpenseDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId, eventId, requestId } = await params;

  let access: Awaited<ReturnType<typeof requireEventAccess>>;
  try {
    access = await requireEventAccess(session.user.id, eventId);
  } catch {
    return <ForbiddenState />;
  }

  const { membership } = access;

  let detail: Awaited<ReturnType<typeof getExpenseRequestDetail>>;
  try {
    detail = await getExpenseRequestDetail(session.user.id, requestId);
  } catch {
    return <ForbiddenState />;
  }

  const { request: req, payments: paymentList, summary } = detail;

  const evidenceList = await db
    .select({
      id: evidenceFiles.id,
      originalFileName: evidenceFiles.originalFileName,
      detectedFileType: evidenceFiles.detectedFileType,
      fileSizeBytes: evidenceFiles.fileSizeBytes,
      createdAt: evidenceFiles.createdAt,
    })
    .from(evidenceFiles)
    .where(eq(evidenceFiles.expenseRequestId, requestId))
    .orderBy(desc(evidenceFiles.createdAt));

  const isBendahara = membership.role === "bendahara";
  const canPay = isBendahara && (req.status === "approved" || req.status === "partially_paid") && summary.remainingBalance > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Navigasi */}
      <div>
        <Link
          href={`/app/${orgId}/events/${eventId}/expenses`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#153D35] hover:underline mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:rounded"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar pengeluaran
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#153D35]">{req.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                Diajukan {formatWaktu(req.createdAt)}
                {req.requestedByName ? ` oleh ${req.requestedByName}` : ""}
              </span>
              {req.budgetItemName && (
                <span className="flex items-center gap-1 text-[#153D35] font-medium bg-[#EAF5F0] px-2 py-0.5 rounded-[4px]">
                  <Tag size={11} className="text-[#35B88A]" />
                  Pos: {req.budgetItemName}
                  {req.budgetItemCategory ? ` (${req.budgetItemCategory})` : ""}
                </span>
              )}
            </div>
          </div>
          <StatusChip status={req.status as any} />
        </div>
      </div>

      {/* Ringkasan Finansial 4 Metrik */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[10px] border border-[#D1E8DF] bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Nominal Diajukan</p>
          <p className="mt-1 font-bold tabular-nums text-slate-900 text-base">{formatRupiah(req.requestedAmount)}</p>
        </div>

        <div className="rounded-[10px] border border-[#D1E8DF] bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Nominal Disetujui</p>
          <p className="mt-1 font-bold tabular-nums text-[#153D35] text-base">
            {req.approvedAmount ? formatRupiah(req.approvedAmount) : "-"}
          </p>
        </div>

        <div className="rounded-[10px] border border-[#D1E8DF] bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Dibayar (Net)</p>
          <p className="mt-1 font-bold tabular-nums text-slate-900 text-base">
            {formatRupiah(summary.totalPaidNet)}
          </p>
        </div>

        <div
          className={`rounded-[10px] border px-4 py-3 shadow-sm ${
            summary.remainingBalance <= 0 && req.approvedAmount
              ? "border-[#35B88A] bg-[#EAF5F0]/60"
              : summary.remainingBalance > 0 && summary.totalPaidNet > 0
              ? "border-amber-300 bg-amber-50/50"
              : "border-[#D1E8DF] bg-white"
          }`}
        >
          <p className="text-xs font-medium text-slate-500">Sisa Belum Dibayar</p>
          <p
            className={`mt-1 font-bold tabular-nums text-base ${
              summary.remainingBalance <= 0 && req.approvedAmount
                ? "text-[#065F46]"
                : summary.remainingBalance > 0
                ? "text-amber-800"
                : "text-slate-800"
            }`}
          >
            {req.approvedAmount
              ? summary.remainingBalance <= 0
                ? "Rp 0 (Lunas)"
                : formatRupiah(summary.remainingBalance)
              : "-"}
          </p>
        </div>
      </div>

      {/* Deskripsi Pengajuan */}
      {req.description && (
        <div className="rounded-[10px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-1">Deskripsi Keperluan Lapangan</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.description}</p>
        </div>
      )}

      {/* Reviewer info jika sudah direview */}
      {req.reviewedAt && (
        <div className="flex items-center gap-2 rounded-[8px] bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-600">
          <User size={13} className="text-slate-500" />
          <span>
            {req.status === "rejected" ? "Ditolak" : "Disetujui"} oleh {req.reviewedByName ?? "Bendahara"} pada{" "}
            {formatWaktu(req.reviewedAt)}
          </span>
        </div>
      )}

      {/* Alasan Penolakan jika ada */}
      {req.status === "rejected" && req.rejectionReason && (
        <div className="rounded-[8px] border border-red-200 bg-[#FEE2E2]/60 px-5 py-4">
          <p className="text-xs font-bold text-[#991B1B] mb-1">Catatan Alasan Penolakan dari Bendahara</p>
          <p className="text-sm text-[#991B1B] font-medium">{req.rejectionReason}</p>
        </div>
      )}

      {/* Tindakan Persetujuan Bendahara jika status submitted */}
      {req.status === "submitted" && (
        <div className="rounded-[10px] border border-[#D1E8DF] bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-bold text-[#153D35] mb-3">Tindakan Verifikasi Bendahara</p>
          <ExpenseActions
            requestId={req.id}
            requestedAmount={req.requestedAmount}
            approvedAmount={req.approvedAmount}
            requestedBy={req.requestedBy}
            currentUserId={session.user.id}
            isBendahara={isBendahara}
            orgId={orgId}
            eventId={eventId}
          />
          {!isBendahara && (
            <p className="text-xs text-slate-500">Pengajuan ini sedang menunggu tinjauan dan persetujuan oleh Bendahara.</p>
          )}
        </div>
      )}

      {/* Tombol Catat Pembayaran untuk Bendahara */}
      {canPay && (
        <div className="flex items-center justify-between rounded-[10px] border border-[#35B88A]/30 bg-[#EAF5F0] p-4">
          <div>
            <p className="text-sm font-bold text-[#153D35]">Pembayaran Lapangan Tersedia</p>
            <p className="text-xs text-slate-600">
              Sisa saldo yang dapat dibayarkan: <strong className="tabular-nums text-[#153D35]">{formatRupiah(summary.remainingBalance)}</strong>.
            </p>
          </div>
          <Link
            href={`/app/${orgId}/events/${eventId}/expenses/${requestId}/pay`}
            className="inline-flex items-center gap-2 rounded-[6px] bg-[#153D35] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A4D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] transition-colors"
          >
            <CreditCard size={15} />
            Catat Pembayaran
          </Link>
        </div>
      )}

      {/* Riwayat Pembayaran & Reversal */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#153D35]">Riwayat Pembayaran & Bukti Pengeluaran</p>
          <span className="text-xs text-slate-500">Tercatat dalam audit log transaksi</span>
        </div>

        {paymentList.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={32} className="text-slate-300" />}
            title="Belum ada transaksi pembayaran"
            description="Pembayaran dapat dicatat oleh Bendahara setelah pengajuan pengeluaran disetujui."
          />
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-[#D1E8DF] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D1E8DF] bg-[#F6F8F7] text-left">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#153D35]">Nominal Pembayaran</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#153D35]">Waktu & Pencatat</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#153D35]">Status Pembayaran</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#153D35]">Catatan</th>
                  {isBendahara && (
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-[#153D35] text-right">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentList.map((p) => {
                  const hasReversals = p.reversals.length > 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold tabular-nums text-[#153D35]">
                          {formatRupiah(p.amount)}
                        </p>
                        {hasReversals && !p.isReversed && (
                          <p className="text-xs font-medium text-amber-700 tabular-nums">
                            Net: {formatRupiah(p.netAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">{formatWaktu(p.postedAt)}</p>
                        <p className="text-slate-500">oleh {p.postedByName ?? "Bendahara"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {p.isReversed ? (
                          <span className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-semibold text-[#991B1B]">
                            Dibatalkan Penuh
                          </span>
                        ) : hasReversals ? (
                          <span className="inline-flex items-center gap-1 rounded-[6px] border border-amber-200 bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E]">
                            Dibatalkan Sebagian
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-[6px] border border-emerald-200 bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-semibold text-[#065F46]">
                            Lunas Dibukukan
                          </span>
                        )}

                        {/* Rincian catatan reversal jika ada */}
                        {hasReversals && (
                          <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-1 text-xs">
                            {p.reversals.map((rev) => (
                              <div key={rev.id} className="rounded bg-slate-50 p-1.5 text-slate-600">
                                <span className="font-semibold text-red-700">-{formatRupiah(rev.amount)}</span>: {rev.reason} (oleh {rev.reversedByName ?? "Bendahara"} pada {formatWaktu(rev.reversedAt)})
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                        {p.notes ?? "-"}
                      </td>
                      {isBendahara && (
                        <td className="px-4 py-3 text-right">
                          {!p.isReversed && (
                            <Link
                              href={`/app/${orgId}/events/${eventId}/expenses/${requestId}/payments/${p.id}/reverse`}
                              className="inline-flex items-center gap-1 rounded-[6px] border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            >
                              <RotateCcw size={12} />
                              Batalkan
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bagian Bukti Transaksi */}
      <EvidenceSection
        organizationId={orgId}
        expenseRequestId={requestId}
        items={evidenceList}
      />
    </div>
  );
}
