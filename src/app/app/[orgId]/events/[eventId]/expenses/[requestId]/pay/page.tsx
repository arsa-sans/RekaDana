"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";
import { Info } from "lucide-react";

interface Props {
  params: Promise<{ orgId: string; eventId: string; requestId: string }>;
}

export default function PayPage({ params: paramsPromise }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!idempotencyKey.trim() || idempotencyKey.trim().length < 8) {
      setError("Kunci idempotensi minimal 8 karakter unik.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Nominal pembayaran harus lebih dari 0.");
      return;
    }

    startTransition(async () => {
      try {
        const { orgId, eventId, requestId } = await paramsPromise;
        const res = await fetch(`/api/v1/expense-requests/${requestId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: idempotencyKey.trim(),
            amount,
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
        setError("Terjadi kesalahan. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Pembayaran</p>
        <h1 className="text-xl font-bold text-slate-900">Catat Pembayaran</h1>
        <p className="text-sm text-slate-500">
          Hanya Bendahara yang dapat mencatat pembayaran. Gunakan kunci idempotensi unik untuk mencegah duplikat.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="idempotencyKey" className="text-sm font-semibold text-slate-700">
              Kunci idempotensi <span className="text-red-500">*</span>
            </label>
            <input
              id="idempotencyKey"
              type="text"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              placeholder="mis. PAY-2024-001-SEWA-SOUND"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-3 py-2">
              <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-600">
                Kunci ini bersifat permanen. Jika pembayaran dikirim ulang dengan kunci yang sama dan nominal identik, sistem akan mengembalikan hasil pembayaran pertama tanpa membuat duplikat.
              </p>
            </div>
          </div>

          <RupiahInput
            id="paymentAmount"
            label="Nominal dibayar"
            value={amount}
            onChange={setAmount}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Nomor referensi transfer, metode pembayaran, dll."
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
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {isPending ? "Mencatat..." : "Catat Pembayaran"}
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
