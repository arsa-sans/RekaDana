import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { getBudgetVersionDetail } from "@/server/modules/budgets.service";
import { ForbiddenState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ orgId: string; eventId: string; versionId: string }>;
}

export default async function BudgetVersionDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId, eventId, versionId } = await params;

  try {
    await requireEventAccess(session.user.id, eventId);
  } catch {
    return <ForbiddenState />;
  }

  const { version, items } = await getBudgetVersionDetail(session.user.id, versionId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/app/${orgId}/events/${eventId}/budgets`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-indigo-500"
        >
          <ArrowLeft size={14} />
          Kembali
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Versi Anggaran #{version.versionNumber}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Diajukan {formatWaktu(version.submittedAt)}
          </p>
        </div>
        <StatusChip status={version.status as any} />
      </div>

      {/* Ringkasan snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">Total anggaran</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{formatRupiah(version.snapshotTotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">Pagu dana saat itu</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{formatRupiah(version.snapshotAvailableFunds ?? "0")}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-400">Peserta</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">{version.snapshotParticipantCount} orang</p>
        </div>
      </div>

      {/* Alasan penolakan */}
      {version.status === "rejected" && version.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">Alasan penolakan</p>
          <p className="mt-1 text-sm text-red-600">{version.rejectionReason}</p>
          {version.reviewedAt && (
            <p className="mt-1 text-xs text-red-400">Ditolak pada {formatWaktu(version.reviewedAt)}</p>
          )}
        </div>
      )}

      {/* Tabel item anggaran */}
      <section aria-label="Rincian item anggaran">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Rincian item ({items.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500">Nama</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500">Kategori</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500">Qty</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500">Harga satuan</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.category ?? "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatRupiah(item.unitCost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">{formatRupiah(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">{formatRupiah(version.snapshotTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
