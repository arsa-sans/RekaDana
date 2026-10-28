import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { getBudgetVersionDetail } from "@/server/modules/budgets.service";
import { ForbiddenState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { ArrowLeft, Clock, User, CheckCircle2, TrendingUp, TrendingDown, Layers, PlusCircle, MinusCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { BudgetVersionActions } from "../BudgetVersionActions";

interface Props {
  params: Promise<{ orgId: string; eventId: string; versionId: string }>;
}

export default async function BudgetVersionDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId, eventId, versionId } = await params;

  let access: Awaited<ReturnType<typeof requireEventAccess>>;
  try {
    access = await requireEventAccess(session.user.id, eventId);
  } catch {
    return <ForbiddenState />;
  }

  const { membership } = access;
  const isBendahara = membership.role === "bendahara";

  const { version, items, comparison } = await getBudgetVersionDetail(session.user.id, versionId);

  const isApproved = version.status === "approved";
  const isSubmitted = version.status === "submitted";

  return (
    <div className="flex flex-col gap-6">
      {/* Tombol kembali ke daftar versi */}
      <div className="flex items-center justify-between">
        <Link
          href={`/app/${orgId}/events/${eventId}/budgets`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#153D35] hover:underline focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#35B88A]"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Riwayat Versi Anggaran</span>
        </Link>
      </div>

      {/* Header Versi & Aksi Persetujuan */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[10px] border border-[#D1E8DF] bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#153D35]">
              Versi Anggaran #{version.versionNumber}
            </h1>
            <StatusChip status={version.status as any} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-slate-400" />
              Diajukan {formatWaktu(version.submittedAt)}
              {version.submittedByName ? ` oleh ${version.submittedByName}` : ""}
            </span>
            {version.reviewedAt && (
              <span className="flex items-center gap-1">
                <User size={12} className="text-slate-400" />
                {version.status === "approved"
                  ? "Disetujui"
                  : version.status === "rejected"
                  ? "Ditolak"
                  : "Direview"}{" "}
                oleh {version.reviewedByName ?? "Bendahara"} pada {formatWaktu(version.reviewedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Tombol Aksi Langsung untuk Bendahara */}
        {isBendahara && isSubmitted && (
          <div className="flex flex-col items-end gap-1">
            <BudgetVersionActions
              versionId={version.id}
              versionNumber={version.versionNumber}
              submittedBy={version.submittedBy}
              currentUserId={session.user.id}
            />
          </div>
        )}
      </div>

      {/* Banner status resmi */}
      {isApproved && (
        <div className="flex items-center gap-2 rounded-[8px] bg-[#EAF5F0] border border-[#35B88A]/30 p-3 text-xs font-semibold text-[#153D35]">
          <CheckCircle2 size={16} className="text-[#35B88A] shrink-0" />
          <span>
            Versi ini adalah anggaran resmi yang aktif saat ini. Semua permintaan pengeluaran lapangan diverifikasi mengacu pada pagu dan item snapshot ini.
          </span>
        </div>
      )}

      {/* Ringkasan Snapshot Finansial */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[#D1E8DF] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Snapshot Anggaran</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#153D35]">
            {formatRupiah(version.snapshotTotal)}
          </p>
        </div>
        <div className="rounded-[10px] border border-[#D1E8DF] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Pagu Dana Saat Diajukan</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">
            {formatRupiah(version.snapshotAvailableFunds ?? "0")}
          </p>
        </div>
        <div className="rounded-[10px] border border-[#D1E8DF] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Estimasi Peserta</p>
          <p className="mt-1 text-xl font-bold text-slate-800">
            {version.snapshotParticipantCount} orang
          </p>
        </div>
      </div>

      {/* Catatan Alasan Penolakan */}
      {version.status === "rejected" && version.rejectionReason && (
        <div className="rounded-[8px] border border-red-200 bg-[#FEE2E2]/60 p-4">
          <p className="text-xs font-bold text-[#991B1B]">Alasan Penolakan dari Bendahara</p>
          <p className="mt-1 text-sm text-[#991B1B] font-medium">{version.rejectionReason}</p>
          {version.reviewedAt && (
            <p className="mt-1 text-xs text-red-500">Ditolak pada {formatWaktu(version.reviewedAt)}</p>
          )}
        </div>
      )}

      {/* Fitur Perbedaan Antar Versi (Diff Snapshot) jika versi > 1 */}
      {comparison && (
        <section aria-label="Perbandingan dengan versi sebelumnya" className="rounded-[10px] border border-[#D1E8DF] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[#153D35]" />
              <h2 className="text-sm font-bold text-[#153D35]">
                Perbandingan dengan Versi #{comparison.previousVersionNumber}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Analisis perbedaan snapshot otomatis
            </span>
          </div>

          {/* Kartu Ringkasan Perubahan */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 p-3">
              <p className="text-xs text-slate-500 font-medium">Selisih Total Anggaran</p>
              <div className="mt-1 flex items-center gap-1">
                {comparison.deltaTotal > 0 ? (
                  <TrendingUp size={16} className="text-amber-600 shrink-0" />
                ) : comparison.deltaTotal < 0 ? (
                  <TrendingDown size={16} className="text-emerald-600 shrink-0" />
                ) : null}
                <p
                  className={`text-sm font-bold tabular-nums ${
                    comparison.deltaTotal > 0
                      ? "text-amber-700"
                      : comparison.deltaTotal < 0
                      ? "text-emerald-700"
                      : "text-slate-700"
                  }`}
                >
                  {comparison.deltaTotal > 0 ? "+" : ""}
                  {formatRupiah(comparison.deltaTotal)} ({comparison.deltaTotalPercentage > 0 ? "+" : ""}
                  {comparison.deltaTotalPercentage}%)
                </p>
              </div>
            </div>

            <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 p-3">
              <p className="text-xs text-slate-500 font-medium">Perubahan Peserta</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {comparison.deltaParticipantCount > 0 ? "+" : ""}
                {comparison.deltaParticipantCount} orang
              </p>
            </div>

            <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 p-3">
              <p className="text-xs text-slate-500 font-medium">Item Baru Ditambahkan</p>
              <p className="mt-1 text-sm font-bold text-emerald-700">
                +{comparison.addedItemsCount} item
              </p>
            </div>

            <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 p-3">
              <p className="text-xs text-slate-500 font-medium">Item Disesuaikan / Dihapus</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {comparison.modifiedItemsCount} diubah, {comparison.removedItemsCount} dihapus
              </p>
            </div>
          </div>

          {/* Rincian item yang berubah */}
          {comparison.diffs.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-[8px] border border-slate-100">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F6F8F7]">
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-600">Perubahan</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-600">Nama Item</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-600">Kategori</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Kuantitas</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Harga Satuan</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-slate-600">Selisih Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparison.diffs.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        {diff.type === "added" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
                            <PlusCircle size={10} /> Baru
                          </span>
                        ) : diff.type === "removed" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-800">
                            <MinusCircle size={10} /> Dihapus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                            <RefreshCw size={10} /> Disesuaikan
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{diff.name}</td>
                      <td className="px-3 py-2 text-slate-500">{diff.category ?? "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {diff.type === "modified" ? (
                          <span>
                            {diff.oldQuantity} &rarr; <strong>{diff.newQuantity}</strong>
                          </span>
                        ) : (
                          diff.newQuantity ?? diff.oldQuantity ?? "-"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                        {diff.type === "modified" ? (
                          <span>
                            {formatRupiah(diff.oldUnitCost ?? "0")} &rarr; <strong>{formatRupiah(diff.newUnitCost ?? "0")}</strong>
                          </span>
                        ) : (
                          formatRupiah(diff.newUnitCost ?? diff.oldUnitCost ?? "0")
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-bold ${
                          (diff.totalDifference ?? 0) > 0
                            ? "text-amber-700"
                            : (diff.totalDifference ?? 0) < 0
                            ? "text-emerald-700"
                            : "text-slate-800"
                        }`}
                      >
                        {(diff.totalDifference ?? 0) > 0 ? "+" : ""}
                        {formatRupiah(diff.totalDifference ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tabel Item Snapshot Anggaran Resmi */}
      <section aria-label="Rincian item anggaran snapshot" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#153D35]">
            Rincian Item Anggaran Snapshot ({items.length} item)
          </h2>
          <span className="text-xs text-slate-500">
            Snapshot bersifat permanen dan tidak dapat diubah
          </span>
        </div>

        <div className="overflow-x-auto rounded-[10px] border border-[#D1E8DF] bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#D1E8DF] bg-[#F6F8F7]">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-[#153D35]">Nama Kebutuhan</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-[#153D35]">Kategori</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[#153D35]">Jumlah</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[#153D35]">Biaya Satuan</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-[#153D35]">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-[#F6F8F7]/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.category ?? "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatRupiah(item.unitCost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#153D35]">{formatRupiah(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#D1E8DF] bg-[#F6F8F7]">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-[#153D35]">
                  Total Anggaran
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-base font-bold text-[#153D35]">
                  {formatRupiah(version.snapshotTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
