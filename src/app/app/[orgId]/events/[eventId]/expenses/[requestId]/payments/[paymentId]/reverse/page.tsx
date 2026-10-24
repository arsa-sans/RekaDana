"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangle } from "lucide-react";

interface Props {
  params: Promise<{
    orgId: string;
    eventId: string;
    requestId: string;
    paymentId: string;
  }>;
}

export default function ReversePage({ params: paramsPromise }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Nominal pembatalan harus lebih dari 0.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Alasan pembatalan wajib diisi minimal 5 karakter.");
      return;
    }

    startTransition(async () => {
      try {
        const { orgId, eventId, requestId, paymentId } = await paramsPromise;
        const res = await fetch(`/api/v1/payments/${paymentId}/reverse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, reason: reason.trim() }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Gagal membatalkan pembayaran.");
          return;
        }

        toast({ variant: "success", title: "Pembatalan pembayaran berhasil dicatat." });
        router.push(`/app/${orgId}/events/${eventId}/expenses/${requestId}`);
        router.refresh();
      } catch {
        setError("Terjadi kesalahan. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Pembayaran</p>
        <h1 className="text-xl font-bold text-slate-900">Batalkan Pembayaran</h1>
        <p className="text-sm text-slate-500">
          Pembatalan (reversal) sebagian atau seluruh nominal pembayaran. Hanya Bendahara yang dapat melakukan ini.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">
          Pembatalan bersifat permanen dan akan tercatat dalam jejak audit. Pastikan nominalnya benar sebelum melanjutkan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 flex flex-col gap-5">
          <RupiahInput
            id="reverseAmount"
            label="Nominal dibatalkan"
            value={amount}
            onChange={setAmount}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reason" className="text-sm font-semibold text-slate-700">
              Alasan pembatalan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Jelaskan alasan pembatalan secara spesifik..."
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {isPending ? "Membatalkan..." : "Konfirmasi Pembatalan"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
