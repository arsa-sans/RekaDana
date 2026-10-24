import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { requireMembership, AuthorizationError } from "@/server/authorization/tenant";
import { getBudgetVsActualReport } from "@/server/modules/reports.service";
import { db } from "@/server/db";
import { events, organizations } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { BudgetSummary } from "@/components/ui/BudgetSummary";
import { ForbiddenState } from "@/components/ui/States";
import { formatWaktu } from "@/lib/utils";
import { Plus, Calendar } from "lucide-react";

interface Props {
  params: Promise<{ orgId: string }>;
}

/**
 * Dashboard utama per organisasi.
 * Menampilkan daftar kegiatan aktif dan ringkasan anggaran dari kegiatan pertama.
 * Tidak ada stat dummy, tidak ada angka rekayasa (R-17).
 */
export default async function DashboardPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId } = await params;

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(session.user.id, orgId);
  } catch {
    return <ForbiddenState />;
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(and(eq(organizations.id, orgId), eq(organizations.isActive, true)))
    .limit(1);

  if (!org) redirect("/app");

  const eventList = await db
    .select({
      id: events.id,
      name: events.name,
      availableFunds: events.availableFunds,
      participantCount: events.participantCount,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(and(eq(events.organizationId, orgId), eq(events.isActive, true)))
    .orderBy(desc(events.createdAt));

  // Ambil laporan kegiatan pertama sebagai ringkasan untuk dashboard.
  let firstReport: Awaited<ReturnType<typeof getBudgetVsActualReport>> | null = null;
  let firstEventName = "";
  if (eventList.length > 0) {
    try {
      firstReport = await getBudgetVsActualReport(session.user.id, eventList[0].id);
      firstEventName = eventList[0].name;
    } catch {
      // Jika laporan gagal dimuat, tetap lanjut ke tampilan daftar kegiatan.
    }
  }

  const role = membership.role;
  const ROLE_LABEL: Record<string, string> = {
    ketua_kegiatan: "Ketua Kegiatan",
    bendahara: "Bendahara",
    panitia_anggota: "Panitia Anggota",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Organisasi</p>
          <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
          <p className="text-sm text-slate-500">Peran Anda: {ROLE_LABEL[role] ?? role}</p>
        </div>
        {(role === "ketua_kegiatan" || role === "bendahara") && (
          <Link
            href={`/app/${orgId}/events/new`}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Plus size={15} />
            Kegiatan baru
          </Link>
        )}
      </div>

      {/* Ringkasan anggaran kegiatan terbaru */}
      {firstReport && (
        <section aria-label={`Ringkasan anggaran: ${firstEventName}`}>
          <p className="mb-2 text-sm font-medium text-slate-500">
            Ringkasan: <span className="text-slate-700">{firstEventName}</span>
          </p>
          <BudgetSummary
            approvedBudgetTotal={firstReport.approvedBudgetTotal}
            actualNet={firstReport.actualNet}
            openCommitments={firstReport.openCommitments}
            remainingControlBudget={firstReport.remainingControlBudget}
          />
        </section>
      )}

      {/* Daftar kegiatan */}
      <section aria-label="Daftar kegiatan">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-700">Kegiatan aktif</h2>
        </div>

        {eventList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
            <Calendar className="mx-auto mb-3 text-slate-300" size={36} />
            <p className="font-medium text-slate-700">Belum ada kegiatan</p>
            <p className="mt-1 text-sm text-slate-500">
              {role === "ketua_kegiatan" || role === "bendahara"
                ? "Buat kegiatan pertama untuk mulai mengelola anggaran."
                : "Hubungi Ketua Kegiatan untuk membuat kegiatan baru."}
            </p>
            {(role === "ketua_kegiatan" || role === "bendahara") && (
              <Link
                href={`/app/${orgId}/events/new`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <Plus size={15} />
                Buat kegiatan
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {eventList.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/app/${orgId}/events/${event.id}/scenarios`}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 group-hover:text-indigo-700">
                      {event.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {event.participantCount} peserta &middot; Dibuat {formatWaktu(event.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
