import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { db } from "@/server/db";
import { payments, paymentReversals } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ForbiddenState } from "@/components/ui/States";
import { ReverseForm } from "./ReverseForm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Props {
  params: Promise<{
    orgId: string;
    eventId: string;
    requestId: string;
    paymentId: string;
  }>;
}

export default async function ReversePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId, eventId, requestId, paymentId } = await params;

  let access: Awaited<ReturnType<typeof requireEventAccess>>;
  try {
    access = await requireEventAccess(session.user.id, eventId);
  } catch {
    return <ForbiddenState message="Anda tidak memiliki akses ke kegiatan ini." />;
  }

  const { membership } = access;
  if (membership.role !== "bendahara") {
    return (
      <ForbiddenState message="Hanya Bendahara yang berwenang melakukan pembatalan pembayaran." />
    );
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (!payment || payment.expenseRequestId !== requestId) {
    notFound();
  }

  const existingReversals = await db
    .select()
    .from(paymentReversals)
    .where(eq(paymentReversals.paymentId, paymentId));

  const paymentAmount = Number(payment.amount);
  const totalReversed = existingReversals.reduce(
    (sum, rev) => sum + Number(rev.amount),
    0
  );
  const remainingReversible = Math.max(0, paymentAmount - totalReversed);

  // Jika pembayaran sudah dibatalkan sepenuhnya
  if (remainingReversible <= 0) {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-base">
            <CheckCircle2 size={18} className="text-emerald-600" />
            Pembayaran Telah Dibatalkan Sepenuhnya
          </div>
          <p className="text-sm text-slate-600">
            Seluruh nominal dari transaksi pembayaran ini ({formatRupiah(paymentAmount)}) telah dibatalkan (Total reversal: {formatRupiah(totalReversed)}). Tidak ada sisa nominal yang dapat dibatalkan lagi.
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Batalkan Pembayaran</h1>
        <p className="text-sm text-slate-600">
          Lakukan koreksi atau pembatalan (reversal) atas pembayaran yang telah dicatat sebelumnya.
        </p>
      </div>

      <ReverseForm
        orgId={orgId}
        eventId={eventId}
        requestId={requestId}
        paymentId={paymentId}
        paymentAmount={paymentAmount}
        totalReversed={totalReversed}
        remainingReversible={remainingReversible}
        paymentDate={payment.postedAt}
        idempotencyKey={payment.idempotencyKey}
        notes={payment.notes}
      />
    </div>
  );
}
