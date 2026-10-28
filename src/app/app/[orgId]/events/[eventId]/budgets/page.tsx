import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { listBudgetVersions } from "@/server/modules/budgets.service";
import { ForbiddenState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { FileCheck, User, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { BudgetVersionActions } from "./BudgetVersionActions";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

/**
 * Halaman review anggaran oleh Bendahara dan anggota kegiatan.
 * Menampilkan histori lengkap versi anggaran, snapshot finansial, dan status persetujuan.
 * Bendahara dapat menyetujui atau menolak versi yang diajukan dengan dialog konfirmasi.
 */
export default async function BudgetReviewPage({ params }: Props) {
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
  const versions = await listBudgetVersions(session.user.id, eventId);

  const isBendahara = membership.role === "bendahara";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wide font-medium text-slate-500">{event.name}</p>
        <h1 className="text-xl font-bold text-[#153D35]">Histori & Review Anggaran</h1>
        <p className="text-sm text-slate-600">
          Riwayat versi anggaran kegiatan dan kendali persetujuan oleh Bendahara.
        </p>
      </div>

      {versions.length === 0 ? (
        <div className="rounded-[10px] border border-[#D1E8DF] bg-white px-6 py-12 text-center shadow-sm">
          <FileCheck className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-semibold text-slate-800">Belum ada versi anggaran</p>
          <p className="mt-1 text-sm text-slate-600">
            Versi anggaran dibuat saat skenario diajukan dari{" "}
            <Link
              href={`/app/${orgId}/events/${eventId}/scenarios`}
              className="font-medium text-[#153D35] underline decoration-[#35B88A] hover:text-[#1A4D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:rounded"
            >
              Scenario Lab
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {versions.map((version) => {
            const isApprovedActive = version.status === "approved";

            return (
              <div
                key={version.id}
                className={`rounded-[10px] border bg-white px-5 py-5 transition-shadow ${
                  isApprovedActive
                    ? "border-[#35B88A] shadow-md ring-1 ring-[#35B88A]/30"
                    : "border-slate-200 shadow-sm hover:shadow"
                }`}
              >
                {/* Banner Versi Resmi Aktif */}
                {isApprovedActive && (
                  <div className="mb-3 flex items-center gap-1.5 rounded-[6px] bg-[#EAF5F0] px-3 py-1.5 text-xs font-semibold text-[#153D35]">
                    <CheckCircle2 size={14} className="text-[#35B88A]" />
                    <span>Anggaran Resmi Aktif: Acuan operasional dan batas komitmen pengeluaran kegiatan saat ini.</span>
                  </div>
                )}

                {/* Header versi */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] font-bold text-sm ${
                        isApprovedActive
                          ? "bg-[#153D35] text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      #{version.versionNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-[#153D35] text-base">
                          Versi Anggaran #{version.versionNumber}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} className="text-slate-400" />
                        Diajukan {formatWaktu(version.submittedAt)}
                        {version.submittedByName ? ` oleh ${version.submittedByName}` : ""}
                      </p>
                    </div>
                  </div>
                  <StatusChip status={version.status as any} />
                </div>

                {/* Ringkasan snapshot finansial */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-500">Total Snapshot</p>
                    <p className="mt-0.5 font-bold tabular-nums text-[#153D35] text-base">
                      {formatRupiah(version.snapshotTotal)}
                    </p>
                  </div>
                  <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-500">Pagu Dana Saat Diajukan</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-slate-800 text-sm">
                      {formatRupiah(version.snapshotAvailableFunds ?? "0")}
                    </p>
                  </div>
                  <div className="rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]/60 px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-500">Estimasi Peserta</p>
                    <p className="mt-0.5 font-semibold text-slate-800 text-sm">
                      {version.snapshotParticipantCount} orang
                    </p>
                  </div>
                </div>

                {/* Reviewer info */}
                {version.reviewedAt && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-[6px]">
                    <User size={13} className="text-slate-500" />
                    <span>
                      {version.status === "approved"
                        ? "Disetujui"
                        : version.status === "rejected"
                        ? "Ditolak"
                        : "Direview"}{" "}
                      oleh {version.reviewedByName ?? "Bendahara"} pada {formatWaktu(version.reviewedAt)}
                    </span>
                  </div>
                )}

                {/* Alasan penolakan jika ada */}
                {version.status === "rejected" && version.rejectionReason && (
                  <div className="mt-3 rounded-[6px] border border-red-200 bg-[#FEE2E2]/60 px-3.5 py-2.5">
                    <p className="text-xs font-bold text-[#991B1B]">Alasan penolakan oleh Bendahara:</p>
                    <p className="mt-0.5 text-xs text-[#991B1B] font-medium">{version.rejectionReason}</p>
                  </div>
                )}

                {/* Footer kartu: link detail & tombol review Bendahara */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <Link
                    href={`/app/${orgId}/events/${eventId}/budgets/${version.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#153D35] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:rounded"
                  >
                    <span>Rincian item & perbandingan versi</span>
                    <ArrowRight size={13} />
                  </Link>

                  {/* Aksi approve/reject hanya untuk Bendahara pada versi submitted */}
                  {isBendahara && version.status === "submitted" && (
                    <BudgetVersionActions
                      versionId={version.id}
                      versionNumber={version.versionNumber}
                      submittedBy={version.submittedBy}
                      currentUserId={session.user.id}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
