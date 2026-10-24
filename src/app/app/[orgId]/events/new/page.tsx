"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { RupiahInput } from "@/components/ui/RupiahInput";

interface Props {
  params: Promise<{ orgId: string }>;
}

/**
 * Halaman buat kegiatan baru.
 * Form sederhana: nama, deskripsi, pagu dana, jumlah peserta.
 */
export default function NewEventPage({ params }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [availableFunds, setAvailableFunds] = useState("");
  const [participantCount, setParticipantCount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 3) next.name = "Nama kegiatan minimal 3 karakter.";
    if (!availableFunds || parseFloat(availableFunds) <= 0) next.availableFunds = "Pagu dana harus lebih dari 0.";
    if (Object.keys(next).length) { setErrors(next); return; }

    startTransition(async () => {
      const { orgId } = await params;
      try {
        const res = await fetch(`/api/v1/organizations/${orgId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            availableFunds: availableFunds,
            participantCount: participantCount ? parseInt(participantCount, 10) : 0,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.errors) setErrors(data.errors);
          else toast({ variant: "error", title: "Gagal membuat kegiatan", description: data.message });
          return;
        }

        toast({ variant: "success", title: "Kegiatan berhasil dibuat" });
        router.replace(`/app/${orgId}/events/${data.data.id}/scenarios`);
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Buat kegiatan baru</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tentukan pagu dana dan jumlah peserta sebagai dasar Scenario Lab.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <div className="flex flex-col gap-5">
          {/* Nama */}
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nama kegiatan <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={!!errors.name}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
              placeholder="Seminar Nasional Teknologi 2026"
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Deskripsi */}
          <div className="flex flex-col gap-1">
            <label htmlFor="desc" className="text-sm font-medium text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Ringkasan singkat kegiatan ini..."
            />
          </div>

          {/* Pagu dana */}
          <RupiahInput
            id="availableFunds"
            label="Pagu dana"
            value={availableFunds}
            onChange={setAvailableFunds}
            error={errors.availableFunds}
            hint="Total dana yang tersedia sebagai batas atas anggaran."
            required
          />

          {/* Jumlah peserta */}
          <div className="flex flex-col gap-1">
            <label htmlFor="participantCount" className="text-sm font-medium text-slate-700">
              Jumlah peserta <span className="text-slate-400 font-normal">(opsional)</span>
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
              placeholder="0"
            />
            <p id="participants-hint" className="text-xs text-slate-500">
              Digunakan untuk menghitung estimasi biaya per peserta di Scenario Lab.
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
            {isPending ? "Menyimpan..." : "Buat kegiatan"}
          </button>
        </div>
      </form>
    </div>
  );
}
