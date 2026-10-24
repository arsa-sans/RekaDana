"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface Props {
  params: Promise<{ orgId: string; eventId: string }>;
}

export default function NewScenarioPage({ params }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [participantCount, setParticipantCount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2)
      next.name = "Nama skenario minimal 2 karakter, misalnya: Hemat, Standar, Premium.";
    if (Object.keys(next).length) { setErrors(next); return; }

    startTransition(async () => {
      const { orgId, eventId } = await params;
      try {
        const res = await fetch(`/api/v1/events/${eventId}/budget-scenarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            participantCount: participantCount ? parseInt(participantCount, 10) : undefined,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.errors) setErrors(data.errors);
          else toast({ variant: "error", title: "Gagal membuat skenario", description: data.message });
          return;
        }

        toast({ variant: "success", title: "Skenario berhasil dibuat", description: "Tambahkan item kebutuhan untuk menghitung estimasi." });
        router.replace(`/app/${orgId}/events/${eventId}/scenarios/${data.data.id}/add-item`);
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Skenario baru</h1>
        <p className="mt-1 text-sm text-slate-500">
          Buat hingga 3 skenario untuk dibandingkan sebelum memilih yang diajukan ke Bendahara.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nama skenario <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={errors.name ? "name-error" : "name-hint"}
              aria-invalid={!!errors.name}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
              placeholder="Skenario Hemat"
            />
            {errors.name
              ? <p id="name-error" role="alert" className="text-xs text-red-600">{errors.name}</p>
              : <p id="name-hint" className="text-xs text-slate-500">Contoh: Hemat, Standar, Premium.</p>
            }
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="desc" className="text-sm font-medium text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Asumsi dan catatan ringkas tentang skenario ini..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="participantCount" className="text-sm font-medium text-slate-700">
              Jumlah peserta <span className="text-slate-400 font-normal">(opsional, timpa nilai kegiatan)</span>
            </label>
            <input
              id="participantCount"
              type="number"
              inputMode="numeric"
              min="0"
              value={participantCount}
              onChange={(e) => setParticipantCount(e.target.value)}
              aria-describedby="participants-hint"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Biarkan kosong untuk menggunakan default kegiatan"
            />
            <p id="participants-hint" className="text-xs text-slate-500">
              Digunakan untuk menghitung biaya per peserta di skenario ini.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Buat skenario"}
          </button>
        </div>
      </form>
    </div>
  );
}
