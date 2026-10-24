import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { listExpenseRequests } from "@/server/modules/expenses.service";
import { ForbiddenState, EmptyState } from "@/components/ui/States";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { Receipt, Plus } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

export default async function ExpensesPage({ params }: Props) {
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
  const requests = await listExpenseRequests(session.user.id, eventId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{event.name}</p>
          <h1 className="text-xl font-bold text-slate-900">Permintaan Pengeluaran</h1>
          <p className="text-sm text-slate-500">Semua permintaan pengeluaran untuk kegiatan ini.</p>
        </div>
        <Link
          href={`/app/${orgId}/events/${eventId}/expenses/new`}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Plus size={16} />
          Ajukan Pengeluaran
        </Link>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={<Receipt size={40} className="text-slate-300" />}
          title="Belum ada permintaan pengeluaran"
          description="Pengajuan pengeluaran muncul di sini setelah anggaran disetujui Bendahara."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Judul</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Diajukan</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Nominal</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-700 text-right">Disetujui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/${orgId}/events/${eventId}/expenses/${req.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600 focus-visible:outline-none focus-visible:underline"
                    >
                      {req.title}
                    </Link>
                    {req.description && (
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{req.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatWaktu(req.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                    {formatRupiah(req.requestedAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={req.status as any} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                    {req.approvedAmount ? formatRupiah(req.approvedAmount) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
