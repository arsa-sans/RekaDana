import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { getExpenseRequestDetail } from "@/server/modules/expenses.service";
import { ForbiddenState } from "@/components/ui/States";
import { PayForm } from "./PayForm";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Props {
  params: Promise<{ orgId: string; eventId: string; requestId: string }>;
}

export default async function PayPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId, eventId, requestId } = await params;

  let access: Awaited<ReturnType<typeof requireEventAccess>>;
  try {
    access = await requireEventAccess(session.user.id, eventId);
  } catch {
    return <ForbiddenState message="Anda tidak memiliki akses ke kegiatan ini." />;
  }

  const { membership } = access;
  if (membership.role !== "bendahara") {
    return (
      <ForbiddenState message="Hanya Bendahara yang berwenang mencatat pembayaran pengeluaran." />
    );
  }

  let detail: Awaited<ReturnType<typeof getExpenseRequestDetail>>;
  try {
    detail = await getExpenseRequestDetail(session.user.id, requestId);
  } catch {
    return (
      <ForbiddenState message="Permintaan pengeluaran tidak ditemukan atau Anda tidak memiliki izin untuk melihatnya." />
    );
  }

  const { request: req, summary } = detail;

  // Validasi status pengeluaran
  if (req.status !== "approved" && req.status !== "partially_paid") {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-base">
            <AlertTriangle size={18} className="text-amber-600" />
            Pengeluaran Belum Disetujui
          </div>
          <p className="text-sm text-amber-800">
            Pembayaran hanya dapat dicatat untuk pengeluaran yang berstatus Disetujui atau Dibayar Sebagian. Status saat ini: <strong className="capitalize">{req.status}</strong>.
          </p>
          <div className="pt-2">
            <Link
              href={`/app/${orgId}/events/${eventId}/expenses/${requestId}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 underline hover:text-amber-950"
            >
              <ArrowLeft size={14} />
              Kembali ke Rincian Pengeluaran
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Jika sudah lunas
  if (summary.remainingBalance <= 0) {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#153D35] font-semibold text-base">
            <CheckCircle2 size={18} className="text-[#35B88A]" />
            Pengeluaran Sudah Lunas Penuh
          </div>
          <p className="text-sm text-emerald-900">
            Seluruh nominal disetujui ({formatRupiah(summary.approvedAmount)}) telah dibayarkan lunas (Total Net: {formatRupiah(summary.totalPaidNet)}). Tidak ada sisa saldo yang perlu dibayarkan.
          </p>
          <div className="pt-2">
            <Link
              href={`/app/${orgId}/events/${eventId}/expenses/${requestId}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#153D35] underline hover:text-[#1A4D43]"
            >
              <ArrowLeft size={14} />
              Kembali ke Rincian Pengeluaran
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/app/${orgId}/events/${eventId}/expenses/${requestId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors w-fit"
        >
          <ArrowLeft size={13} />
          Kembali ke Rincian Pengeluaran
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catat Pembayaran</h1>
        <p className="text-sm text-slate-600">
          Catat pembayaran penuh atau bertahap (parsial) dengan proteksi duplikasi otomatis.
        </p>
      </div>

      <PayForm
        orgId={orgId}
        eventId={eventId}
        requestId={requestId}
        requestTitle={req.title}
        approvedAmount={summary.approvedAmount}
        totalPaidNet={summary.totalPaidNet}
        remainingBalance={summary.remainingBalance}
      />
    </div>
  );
}
