"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import {
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  AlertCircle,
} from "lucide-react";

interface ReverseFormProps {
  orgId: string;
  eventId: string;
  requestId: string;
  paymentId: string;
  paymentAmount: number;
  totalReversed: number;
  remainingReversible: number;
  paymentDate: Date | string;
  idempotencyKey: string;
  notes?: string | null;
}

export function ReverseForm({
  orgId,
  eventId,
  requestId,
  paymentId,
  paymentAmount,
  totalReversed,
  remainingReversible,
  paymentDate,
  idempotencyKey,
  notes,
}: ReverseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState(
    remainingReversible > 0 ? remainingReversible.toString() : ""
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const isExceeding = numericAmount > remainingReversible;
  const isReasonValid = reason.trim().length >= 5;

  function handleOpenConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (numericAmount <= 0) {
      setError("Nominal pembatalan harus lebih dari 0.");
      return;
    }
    if (numericAmount > remainingReversible) {
      setError(
        `Nominal pembatalan (${formatRupiah(numericAmount)}) melebihi sisa yang dapat dibatalkan (${formatRupiah(remainingReversible)}).`
      );
      return;
    }
    if (!isReasonValid) {
      setError("Alasan pembatalan wajib diisi minimal 5 karakter.");
      return;
    }

    setShowConfirmModal(true);
  }

  function handleConfirmReversal() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/payments/${paymentId}/reverse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericAmount.toString(),
            reason: reason.trim(),
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Gagal membatalkan pembayaran.");
          setShowConfirmModal(false);
          return;
        }

        toast({
          variant: "success",
          title: "Pembatalan pembayaran berhasil dibukukan.",
        });
        setShowConfirmModal(false);
        router.push(`/app/${orgId}/events/${eventId}/expenses/${requestId}`);
        router.refresh();
      } catch {
        setError("Terjadi kesalahan jaringan atau server. Silakan coba kembali.");
        setShowConfirmModal(false);
      }
    });
  }

  return (
    <>
      <form onSubmit={handleOpenConfirm} className="flex flex-col gap-6 max-w-2xl">
        {/* Info Transaksi Asal */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-slate-500" />
              <div>
                <p className="text-xs text-slate-500">ID Transaksi Pembayaran</p>
                <p className="text-xs font-mono font-medium text-slate-700">{paymentId}</p>
              </div>
            </div>
            <span className="text-xs text-slate-500">
              {formatWaktu(paymentDate)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Nominal Asli</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatRupiah(paymentAmount)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Telah Dibatalkan</p>
              <p className="text-sm font-bold text-red-600 mt-0.5">
                {formatRupiah(totalReversed)}
              </p>
            </div>
            <div className="rounded-lg bg-red-50/70 border border-red-100 p-3">
              <p className="text-xs font-medium text-red-900">Maksimal Pembatalan</p>
              <p className="text-base font-bold text-red-700 mt-0.5">
                {formatRupiah(remainingReversible)}
              </p>
            </div>
          </div>

          {notes && (
            <p className="text-xs text-slate-600 italic bg-slate-50 rounded-md p-2 mt-3 border border-slate-100">
              Catatan asli: {notes}
            </p>
          )}
        </div>

        {/* Form Input Pembatalan */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-5 shadow-xs">
          {/* Tombol Pintasan Nominal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Pintasan Pembatalan
            </label>
            <div>
              <button
                type="button"
                onClick={() => setAmount(remainingReversible.toString())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
              >
                <RotateCcw size={13} className="text-red-600" />
                Batalkan Seluruh Sisa ({formatRupiah(remainingReversible)})
              </button>
            </div>
          </div>

          {/* Input Nominal Pembatalan */}
          <div className="flex flex-col gap-1.5">
            <RupiahInput
              id="reverseAmount"
              label="Nominal yang Dibatalkan"
              value={amount}
              onChange={setAmount}
              required
            />

            {isExceeding && (
              <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                <span>
                  Nominal melebihi batas maksimal yang dapat dibatalkan ({formatRupiah(remainingReversible)}).
                </span>
              </div>
            )}
          </div>

          {/* Input Alasan */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="reason" className="text-sm font-semibold text-slate-800">
                Alasan Pembatalan <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs ${
                  reason.trim().length >= 5 ? "text-emerald-700 font-medium" : "text-slate-400"
                }`}
              >
                {reason.trim().length}/5 karakter minimum
              </span>
            </div>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Jelaskan alasan pembatalan transaksi secara rinci (mis. koreksi salah input, transaksi dibatalkan vendor, dll.)..."
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>

          {/* Peringatan Audit */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <AlertTriangle size={15} className="text-amber-700 mt-0.5 shrink-0" />
            <span>
              Tindakan pembatalan bersifat permanen dan akan dicatat secara lengkap pada jejak audit sistem termasuk nama pengguna dan stempel waktu.
            </span>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || isExceeding || numericAmount <= 0 || !isReasonValid}
            className="rounded-md bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
          >
            Lanjutkan ke Konfirmasi
          </button>
          <Link
            href={`/app/${orgId}/events/${eventId}/expenses/${requestId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
          >
            <ArrowLeft size={15} />
            Batal
          </Link>
        </div>
      </form>

      {/* Modal Konfirmasi Pembatalan (R-26) */}
      <ConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title="Konfirmasi Pembatalan Pembayaran"
        description={`Anda akan membatalkan pembayaran sebesar ${formatRupiah(numericAmount)}. Pembatalan ini akan mengembalikan sisa kewajiban pembayaran pada pengeluaran.`}
        confirmLabel={isPending ? "Membatalkan..." : "Ya, Batalkan Pembayaran"}
        cancelLabel="Kembali"
        onConfirm={handleConfirmReversal}
        variant="destructive"
        loading={isPending}
      >
        <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <div>
            <span className="font-semibold text-slate-900">Alasan:</span> {reason}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Kunci Idempotensi Asli:</span>{" "}
            <span className="font-mono">{idempotencyKey}</span>
          </div>
        </div>
      </ConfirmModal>
    </>
  );
}
