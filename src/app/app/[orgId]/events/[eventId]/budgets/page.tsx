import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { listBudgetVersions } from "@/server/modules/budgets.service";
import { db } from "@/server/db";
import { events } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ForbiddenState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { FileCheck, User, Clock } from "lucide-react";
import Link from "next/link";
import { BudgetVersionActions } from "./BudgetVersionActions";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

/**
 * Halaman review anggaran oleh Bendahara.
 * Menampilkan semua versi anggaran dengan detail snapshot, submitter, dan waktu pengajuan.
 * Tombol approve/reject hanya muncul untuk Bendahara dan versi berstatus submitted.
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
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{event.name}</p>
        <h1 className="text-xl font-bold text-slate-900">Review Anggaran</h1>
        <p className="text-sm text-slate-500">Riwayat versi anggaran dan status persetujuan Bendahara.</p>
      </div>

      {versions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <FileCheck className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-medium text-slate-700">Belum ada versi anggaran</p>
          <p className="mt-1 text-sm text-slate-500">
            Versi anggaran dibuat saat skenario diajukan dari{" "}
            <Link href={`/app/${orgId}/events/${eventId}/scenarios`} className="text-indigo-600 hover:underline">
              Scenario Lab
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {versions.map((version) => (
            <div
              key={version.id}
              className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm"
            >
              {/* Header versi */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 font-bold text-sm">
                    #{version.versionNumber}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Versi Anggaran #{version.versionNumber}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={11} />
                      Diajukan {formatWaktu(version.submittedAt)}
                    </p>
                  </div>
                </div>
                <StatusChip status={version.status as any} />
              </div>

              {/* Ringkasan snapshot */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-400">Total snapshot</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {formatRupiah(version.snapshotTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-400">Pagu dana saat itu</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {formatRupiah(version.snapshotAvailableFunds ?? "0")}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-400">Peserta</p>
                  <p className="mt-0.5 font-semibold text-slate-900">
                    {version.snapshotParticipantCount} orang
                  </p>
                </div>
              </div>

              {/* Reviewer info jika sudah direview */}
              {version.reviewedAt && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <User size={11} />
                  <span>
                    {version.status === "approved" ? "Disetujui" : version.status === "rejected" ? "Ditolak" : "Direview"}{" "}
                    oleh Bendahara pada {formatWaktu(version.reviewedAt)}
                  </span>
                </div>
              )}

              {/* Alasan penolakan jika ada */}
              {version.status === "rejected" && version.rejectionReason && (
                <div className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2.5">
                  <p className="text-xs font-medium text-red-700">Alasan penolakan</p>
                  <p className="mt-0.5 text-xs text-red-600">{version.rejectionReason}</p>
                </div>
              )}

              {/* Detail item: link ke halaman detail */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <Link
                  href={`/app/${orgId}/events/${eventId}/budgets/${version.id}`}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-indigo-500"
                >
                  Lihat detail item anggaran
                </Link>

                {/* Aksi approve/reject hanya untuk Bendahara dan versi submitted */}
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
          ))}
        </div>
      )}
    </div>
  );
}
