import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { ForbiddenState, EmptyState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { db } from "@/server/db";
import { expenseRequests, payments, paymentReversals, evidenceFiles } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExpenseActions } from "../ExpenseActions";
import { EvidenceSection } from "./EvidenceSection";
import { ArrowLeft, CreditCard, RotateCcw } from "lucide-react";
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

  const [req] = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, requestId))
    .limit(1);

  if (!req) return <ForbiddenState />;

  const paymentList = await db
    .select()
    .from(payments)
    .where(eq(payments.expenseRequestId, requestId));

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
  const canPay = isBendahara && (req.status === "approved" || req.status === "partially_paid");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/app/${orgId}/events/${eventId}/expenses`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{req.title}</h1>
        <div className="flex items-center gap-3 mt-1.5">
          <StatusChip status={req.status as any} />
          <span className="text-xs text-slate-400">{formatWaktu(req.createdAt)}</span>
        </div>
      </div>

      {/* Nominal summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">Nominal diajukan</p>
          <p className="mt-1 font-bold tabular-nums text-slate-900">{formatRupiah(req.requestedAmount)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">Nominal disetujui</p>
          <p className="mt-1 font-bold tabular-nums text-slate-900">
            {req.approvedAmount ? formatRupiah(req.approvedAmount) : "-"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">Total sudah dibayar</p>
          <p className="mt-1 font-bold tabular-nums text-slate-900">
            {formatRupiah(
              paymentList.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)
            )}
          </p>
        </div>
      </div>

      {req.description && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Deskripsi</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.description}</p>
        </div>
      )}

      {req.status === "rejected" && req.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-xs font-semibold text-red-700 mb-1">Alasan penolakan</p>
          <p className="text-sm text-red-600">{req.rejectionReason}</p>
        </div>
      )}

      {/* Approve/Reject actions */}
      {req.status === "submitted" && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Tindakan Bendahara</p>
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
            <p className="text-xs text-slate-400">Menunggu review Bendahara.</p>
          )}
        </div>
      )}

      {/* Post payment button */}
      {canPay && (
        <div>
          <Link
            href={`/app/${orgId}/events/${eventId}/expenses/${requestId}/pay`}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <CreditCard size={15} />
            Catat Pembayaran
          </Link>
        </div>
      )}

      {/* Payment history */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">Riwayat Pembayaran</p>
        {paymentList.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={32} className="text-slate-300" />}
            title="Belum ada pembayaran"
            description="Pembayaran dicatat oleh Bendahara setelah permintaan disetujui."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">Nominal</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Waktu</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Catatan</th>
                  {isBendahara && (
                    <th className="px-4 py-3 font-semibold text-slate-700">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-900">
                      {formatRupiah(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatWaktu(p.postedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {p.isReversed ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Dibatalkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Dicatat
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.notes ?? "-"}
                    </td>
                    {isBendahara && (
                      <td className="px-4 py-3">
                        {!p.isReversed && (
                          <Link
                            href={`/app/${orgId}/events/${eventId}/expenses/${requestId}/payments/${p.id}/reverse`}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:underline"
                          >
                            <RotateCcw size={12} />
                            Batalkan
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Evidence section */}
      <EvidenceSection
        organizationId={orgId}
        expenseRequestId={requestId}
        items={evidenceList}
      />
    </div>
  );
}
