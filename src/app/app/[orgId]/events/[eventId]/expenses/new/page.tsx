"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

export default function NewExpensePage({ params: paramsPromise }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul permintaan pengeluaran wajib diisi.");
      return;
    }
    if (!requestedAmount || parseFloat(requestedAmount) <= 0) {
      setError("Nominal pengeluaran harus lebih dari 0.");
      return;
    }

    startTransition(async () => {
      try {
        const resolvedParams = await paramsPromise;
        const { orgId, eventId } = resolvedParams;

        const res = await fetch(`/api/v1/events/${eventId}/expense-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            requestedAmount,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error?.message ?? "Gagal mengajukan permintaan pengeluaran.");
          return;
        }

        toast({ variant: "success", title: "Permintaan pengeluaran berhasil diajukan." });
        router.push(`/app/${orgId}/events/${eventId}/expenses`);
        router.refresh();
      } catch {
        setError("Terjadi kesalahan. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Permintaan Pengeluaran</p>
        <h1 className="text-xl font-bold text-slate-900">Ajukan Pengeluaran</h1>
        <p className="text-sm text-slate-500">
          Isi detail permintaan pengeluaran. Membutuhkan versi anggaran resmi yang sudah disetujui Bendahara.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-semibold text-slate-700">
              Judul pengeluaran <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Sewa sound system"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detail kebutuhan, vendor, atau catatan lain"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Nominal diajukan <span className="text-red-500">*</span>
            </label>
            <RupiahInput id="requestedAmount" label="Nominal (Rp)" value={requestedAmount} onChange={setRequestedAmount} />
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
            {isPending ? "Mengajukan..." : "Ajukan Permintaan"}
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
