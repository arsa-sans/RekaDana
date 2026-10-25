import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { listScenariosWithCalculations } from "@/server/modules/scenarios.service";
import { requireEventAccess } from "@/server/authorization/tenant";
import { BudgetSummary } from "@/components/ui/BudgetSummary";
import { StatusChip } from "@/components/ui/StatusChip";
import { ForbiddenState } from "@/components/ui/States";
import { formatRupiah } from "@/lib/utils";
import { Plus, FlaskConical, AlertTriangle, TrendingDown } from "lucide-react";
import { ScenarioActions } from "./ScenarioActions";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

/**
 * Halaman Scenario Lab: tabel komparasi skenario berdampingan.
 * Sorot selisih biaya, defisit, kebutuhan belum terdanai (DESIGN.md).
 * Seluruh data dari API nyata, tidak ada angka rekayasa (R-17).
 */
export default async function ScenarioLabPage({ params }: Props) {
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
  const scenarios = await listScenariosWithCalculations(session.user.id, eventId);

  const canEdit = membership.role === "ketua_kegiatan" ||
                  membership.role === "bendahara" ||
                  membership.role === "panitia_anggota";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{event.name}</p>
          <h1 className="text-xl font-bold text-slate-900">Scenario Lab</h1>
          <p className="text-sm text-slate-500">
            Pagu dana: <span className="font-semibold text-slate-700 tabular-nums">{formatRupiah(event.availableFunds)}</span>
          </p>
        </div>
        {canEdit && scenarios.length < 3 && (
          <Link
            href={`/app/${orgId}/events/${eventId}/scenarios/new`}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Plus size={15} />
            Skenario baru
          </Link>
        )}
      </div>

      {/* Empty state */}
      {scenarios.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <FlaskConical className="mx-auto mb-3 text-slate-300" size={40} />
          <p className="font-medium text-slate-700">Belum ada skenario</p>
          <p className="mt-1 text-sm text-slate-500">
            Buat hingga 3 skenario anggaran untuk dibandingkan sebelum diajukan ke Bendahara.
          </p>
          {canEdit && (
            <Link
              href={`/app/${orgId}/events/${eventId}/scenarios/new`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Plus size={15} />
              Buat skenario pertama
            </Link>
          )}
        </div>
      )}

      {/* Tabel komparasi skenario berdampingan */}
      {scenarios.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <caption className="sr-only">Perbandingan skenario anggaran</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Nama skenario
                </th>
                {scenarios.map((s) => (
                  <th key={s.id} scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {s.name}
                    {s.isDeficit && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-red-500" aria-label="Defisit">
                        <TrendingDown size={12} />
                        <span className="text-xs font-medium">Defisit</span>
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 text-slate-500 text-xs">Jumlah peserta</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="px-4 py-3 text-right tabular-nums text-slate-900">
                    {s.participantCount} orang
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">Total estimasi</td>
                {scenarios.map((s) => (
                  <td key={s.id} className={`px-4 py-3 text-right tabular-nums font-semibold ${s.isDeficit ? "text-red-600" : "text-slate-900"}`}>
                    {formatRupiah(s.scenarioTotal)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-500 text-xs">Biaya per peserta</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {s.costPerParticipant ? formatRupiah(s.costPerParticipant) : "-"}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50">
                <td className="px-4 py-3 text-slate-500 text-xs">Selisih dengan pagu</td>
                {scenarios.map((s) => (
                  <td key={s.id} className={`px-4 py-3 text-right tabular-nums font-medium ${parseFloat(s.fundGap) < 0 ? "text-red-600" : "text-green-600"}`}>
                    {parseFloat(s.fundGap) >= 0 ? "+" : ""}{formatRupiah(s.fundGap)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-500 text-xs">Kebutuhan wajib belum terdanai</td>
                {scenarios.map((s) => (
                  <td key={s.id} className={`px-4 py-3 text-right tabular-nums ${s.unfundedItemsCount > 0 ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                    {s.unfundedItemsCount > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        <AlertTriangle size={13} />
                        {s.unfundedItemsCount} item
                      </span>
                    ) : <span className="text-slate-400 text-xs">Aman</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Rincian item per skenario */}
      {scenarios.map((scenario) => (
        <section key={scenario.id} aria-label={`Detail skenario: ${scenario.name}`}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-800">{scenario.name}</h2>
            {canEdit && (
              <ScenarioActions
                scenarioId={scenario.id}
                isDeficit={scenario.isDeficit}
                orgId={orgId}
                eventId={eventId}
              />
            )}
          </div>

          {scenario.items.length === 0 ? (
            <p className="text-sm text-slate-500 px-1">Belum ada item kebutuhan. Tambahkan item untuk menghitung estimasi.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <caption className="sr-only">Item kebutuhan skenario {scenario.name}</caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Nama</th>
                    <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Kategori</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Qty</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Harga satuan</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Total</th>
                    <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">Prioritas</th>
                    <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium text-slate-500">Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scenario.items.map((item) => (
                    <tr key={item.id} className={!item.isIncluded ? "opacity-50" : undefined}>
                      <td className="px-4 py-2.5 text-slate-900">{item.name}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{item.category ?? "-"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatRupiah(item.estimatedUnitCost)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">{formatRupiah(item.itemTotal)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          item.priority === "required" ? "bg-red-50 text-red-700" :
                          item.priority === "optional" ? "bg-slate-100 text-slate-500" :
                          "bg-blue-50 text-blue-700"
                        }`}>
                          {item.priority === "required" ? "Wajib" :
                           item.priority === "optional" ? "Opsional" : "Normal"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs">
                        {item.isIncluded
                          ? <span className="text-green-600 font-medium">Ya</span>
                          : <span className="text-slate-400">Tidak</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
