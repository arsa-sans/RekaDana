"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils";
import {
  CreditCard,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

interface PayFormProps {
  orgId: string;
  eventId: string;
  requestId: string;
  requestTitle: string;
  approvedAmount: number;
  totalPaidNet: number;
  remainingBalance: number;
}

export function PayForm({
  orgId,
  eventId,
  requestId,
  requestTitle,
  approvedAmount,
  totalPaidNet,
  remainingBalance,
}: PayFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const generateDefaultKey = () =>
    `PAY-${requestId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const [idempotencyKey, setIdempotencyKey] = useState(generateDefaultKey());
  const [amount, setAmount] = useState(remainingBalance > 0 ? remainingBalance.toString() : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount) || 0;
  const isOverpayment = numericAmount > remainingBalance;
  const isFullPayment = numericAmount === remainingBalance && remainingBalance > 0;
  const isPartialPayment = numericAmount > 0 && numericAmount < remainingBalance;
  const balanceAfter = Math.max(0, remainingBalance - numericAmount);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const key = idempotencyKey.trim();
    if (!key || key.length < 8) {
      setError("Kunci idempotensi wajib minimal 8 karakter unik.");
      return;
    }
    if (numericAmount <= 0) {
      setError("Nominal pembayaran harus lebih dari 0.");
      return;
    }
    if (numericAmount > remainingBalance) {
      setError(
        `Nominal pembayaran (${formatRupiah(numericAmount)}) melebihi sisa yang belum dibayar (${formatRupiah(remainingBalance)}).`
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/expense-requests/${requestId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: key,
            amount: numericAmount.toString(),
            notes: notes.trim() || undefined,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Gagal mencatat pembayaran.");
          return;
        }

        const isDuplicate = json.data?.isDuplicateReplay;
        toast({
          variant: "success",
          title: isDuplicate
            ? "Pembayaran sudah tercatat sebelumnya (replay idempotensi)."
            : "Pembayaran berhasil dicatat.",
        });
        router.push(`/app/${orgId}/events/${eventId}/expenses/${requestId}`);
        router.refresh();
      } catch {
        setError("Terjadi kesalahan jaringan atau server. Silakan coba kembali.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {/* Kartu Ringkasan Sisa Saldo */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Permintaan Pengeluaran
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">{requestTitle}</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#153D35] border border-emerald-200">
            <CreditCard size={13} className="text-[#35B88A]" />
            Siap Dibayar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Nominal Disetujui</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {formatRupiah(approvedAmount)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Telah Dibayar (Net)</p>
            <p className="text-sm font-bold text-emerald-800 mt-0.5">
              {formatRupiah(totalPaidNet)}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-3">
            <p className="text-xs font-medium text-emerald-900">Sisa Belum Dibayar</p>
            <p className="text-base font-bold text-[#153D35] mt-0.5">
              {formatRupiah(remainingBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Form Input Pembayaran */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-5 shadow-xs">
        {/* Tombol Pintasan Nominal */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Pintasan Nominal
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAmount(remainingBalance.toString())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-emerald-300 bg-emerald-50 text-[#153D35] hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle2 size={13} className="text-[#35B88A]" />
              Bayar Lunas Penuh ({formatRupiah(remainingBalance)})
            </button>
            {remainingBalance > 10000 && (
              <button
                type="button"
                onClick={() => setAmount(Math.floor(remainingBalance / 2).toString())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                50% dari Sisa ({formatRupiah(Math.floor(remainingBalance / 2))})
              </button>
            )}
          </div>
        </div>

        {/* Input Rupiah */}
        <div className="flex flex-col gap-1.5">
          <RupiahInput
            id="paymentAmount"
            label="Nominal Pembayaran"
            value={amount}
            onChange={setAmount}
            required
          />

          {/* Status Penjelasan Pembayaran */}
          {isOverpayment && (
            <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>
                Nominal melebihi sisa tagihan! Maksimal pembayaran adalah {formatRupiah(remainingBalance)}.
              </span>
            </div>
          )}
          {isFullPayment && (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-[#153D35]">
              <CheckCircle2 size={14} className="shrink-0 text-[#35B88A]" />
              <span>
                Pembayaran Penuh. Status pengeluaran akan otomatis menjadi lunas setelah transaksi tercatat.
              </span>
            </div>
          )}
          {isPartialPayment && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
              <CreditCard size={14} className="shrink-0 text-amber-600" />
              <span>
                Pembayaran Sebagian. Sisa tagihan berikutnya adalah {formatRupiah(balanceAfter)}.
              </span>
            </div>
          )}
        </div>

        {/* Kunci Idempotensi */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="idempotencyKey" className="text-sm font-semibold text-slate-800">
              Kunci Idempotensi <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIdempotencyKey(generateDefaultKey())}
              className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-medium"
            >
              <Sparkles size={12} className="text-[#35B88A]" />
              Buat Kunci Baru
            </button>
          </div>
          <input
            id="idempotencyKey"
            type="text"
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            placeholder="mis. PAY-EXPENSE-01-TRANSFER"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#35B88A] focus:border-[#35B88A]"
          />
          <div className="flex items-start gap-1.5 rounded-md bg-emerald-50/60 border border-emerald-100 px-3 py-2 text-xs text-[#153D35]">
            <ShieldCheck size={14} className="text-[#35B88A] mt-0.5 shrink-0" />
            <span>
              Kunci idempotensi melindungi dari pemotongan ganda saat koneksi terputus. Jika request terkirim ulang dengan kunci dan nominal yang sama, sistem tidak akan menduplikasi pembayaran.
            </span>
          </div>
        </div>

        {/* Catatan */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-semibold text-slate-800">
            Catatan Tambahan <span className="text-slate-400 font-normal">(opsional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Nomor referensi transfer, nama bank penyalur, atau informasi memo..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#35B88A] focus:border-[#35B88A] resize-none"
          />
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
          disabled={isPending || isOverpayment || numericAmount <= 0}
          className="rounded-md bg-[#153D35] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#1A4D43] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:ring-offset-2 transition-colors"
        >
          {isPending ? "Memproses..." : "Konfirmasi Pembayaran"}
        </button>
        <Link
          href={`/app/${orgId}/events/${eventId}/expenses/${requestId}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke Rincian
        </Link>
      </div>
    </form>
  );
}
