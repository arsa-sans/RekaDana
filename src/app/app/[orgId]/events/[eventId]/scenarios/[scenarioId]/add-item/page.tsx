"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { RupiahInput } from "@/components/ui/RupiahInput";

interface Props {
  params: Promise<{ orgId: string; eventId: string; scenarioId: string }>;
}

export default function AddScenarioItemPage({ params }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"required" | "normal" | "optional">("normal");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [isIncluded, setIsIncluded] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Kalkulasi preview item total secara lokal.
  const itemTotal = quantity && unitCost
    ? (parseFloat(quantity) * parseFloat(unitCost))
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) next.name = "Nama item minimal 2 karakter.";
    if (!quantity || parseFloat(quantity) <= 0) next.quantity = "Kuantitas harus lebih dari 0.";
    if (!unitCost || parseFloat(unitCost) < 0) next.unitCost = "Harga satuan tidak boleh negatif.";
    if (Object.keys(next).length) { setErrors(next); return; }

    startTransition(async () => {
      const { orgId, eventId, scenarioId } = await params;
      try {
        const res = await fetch(`/api/v1/budget-scenarios/${scenarioId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim() || undefined,
            priority,
            quantity,
            estimatedUnitCost: unitCost,
            isIncluded,
            notes: notes.trim() || undefined,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.errors) setErrors(data.errors);
          else toast({ variant: "error", title: "Gagal menambah item", description: data.message });
          return;
        }

        toast({ variant: "success", title: "Item berhasil ditambahkan" });
        // Reset form untuk tambah item berikutnya.
        setName(""); setCategory(""); setPriority("normal"); setQuantity(""); setUnitCost(""); setNotes(""); setIsIncluded(true);
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  async function handleDone() {
    const { orgId, eventId } = await params;
    router.replace(`/app/${orgId}/events/${eventId}/scenarios`);
  }

  const PRIORITY_OPTIONS: { value: "required" | "normal" | "optional"; label: string; description: string }[] = [
    { value: "required", label: "Wajib", description: "Kegiatan tidak bisa berjalan tanpa item ini." },
    { value: "normal", label: "Normal", description: "Diperlukan tapi masih bisa dikurangi jika dana tidak cukup." },
    { value: "optional", label: "Opsional", description: "Tambahan yang bisa dihilangkan jika diperlukan." },
  ];

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Tambah item kebutuhan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Setiap item yang disimpan langsung terlihat di Scenario Lab. Anda bisa menambah lebih dari satu item.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <div className="flex flex-col gap-5">
          {/* Nama item */}
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
              Nama item <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={!!errors.name}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
              placeholder="Sewa Gedung Auditorium"
            />
            {errors.name && <p id="name-error" role="alert" className="text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Kategori & Prioritas dalam satu baris */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="category" className="text-sm font-medium text-slate-700">
                Kategori <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Logistik"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="priority" className="text-sm font-medium text-slate-700">Prioritas</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {PRIORITY_OPTIONS.find((o) => o.value === priority)?.description}
              </p>
            </div>
          </div>

          {/* Qty & Harga satuan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="quantity" className="text-sm font-medium text-slate-700">
                Kuantitas <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="quantity"
                type="number"
                inputMode="numeric"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-describedby={errors.quantity ? "qty-error" : undefined}
                aria-invalid={!!errors.quantity}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
                placeholder="1"
              />
              {errors.quantity && <p id="qty-error" role="alert" className="text-xs text-red-600">{errors.quantity}</p>}
            </div>

            <RupiahInput
              id="unitCost"
              label="Harga satuan"
              value={unitCost}
              onChange={setUnitCost}
              error={errors.unitCost}
              required
            />
          </div>

          {/* Preview total */}
          {itemTotal !== null && (
            <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-slate-500">Total estimasi item ini</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(itemTotal)}
              </span>
            </div>
          )}

          {/* Masukkan ke perhitungan */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isIncluded}
              onChange={(e) => setIsIncluded(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">
              Masukkan ke perhitungan total skenario
              <span className="ml-1 text-slate-400 font-normal text-xs">(hilangkan centang untuk menonaktifkan sementara)</span>
            </span>
          </label>

          {/* Catatan */}
          <div className="flex flex-col gap-1">
            <label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Asumsi harga atau referensi vendor..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            onClick={handleDone}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Selesai
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Tambah item"}
          </button>
        </div>
      </form>
    </div>
  );
}
