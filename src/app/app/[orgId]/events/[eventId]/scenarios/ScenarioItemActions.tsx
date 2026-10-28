"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { Pencil, Trash2, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface ItemData {
  id: string;
  name: string;
  category: string | null;
  priority: string | null;
  quantity: string;
  estimatedUnitCost: string;
  isIncluded: boolean;
  notes: string | null;
}

interface Props {
  scenarioId: string;
  item: ItemData;
}

export function ScenarioItemActions({ scenarioId, item }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [isUpdating, startUpdateTransition] = useTransition();

  // Form states for edit
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || "");
  const [priority, setPriority] = useState<"required" | "normal" | "optional">(
    (item.priority as "required" | "normal" | "optional") || "normal"
  );
  const [quantity, setQuantity] = useState(item.quantity);
  const [estimatedUnitCost, setEstimatedUnitCost] = useState(
    String(Math.round(parseFloat(item.estimatedUnitCost || "0")))
  );
  const [isIncluded, setIsIncluded] = useState(item.isIncluded);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        const res = await fetch(`/api/v1/budget-scenarios/${scenarioId}/items/${item.id}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (!res.ok) {
          toast({ variant: "error", title: "Gagal menghapus item", description: data.message });
          setDeleteOpen(false);
          return;
        }

        toast({ variant: "success", title: "Item berhasil dihapus" });
        setDeleteOpen(false);
        router.refresh();
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      next.name = "Nama kebutuhan minimal 2 karakter.";
    }
    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) {
      next.quantity = "Kuantitas harus lebih dari 0.";
    }
    const c = parseFloat(estimatedUnitCost);
    if (isNaN(c) || c < 0) {
      next.estimatedUnitCost = "Biaya satuan tidak boleh negatif.";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    startUpdateTransition(async () => {
      try {
        const res = await fetch(`/api/v1/budget-scenarios/${scenarioId}/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim() || undefined,
            priority,
            quantity: String(q),
            estimatedUnitCost: String(c),
            isIncluded,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.errors) setErrors(data.errors);
          else toast({ variant: "error", title: "Gagal memperbarui item", description: data.message });
          return;
        }

        toast({ variant: "success", title: "Item berhasil diperbarui" });
        setEditOpen(false);
        router.refresh();
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Tombol Edit */}
      <button
        type="button"
        onClick={() => {
          setName(item.name);
          setCategory(item.category || "");
          setPriority((item.priority as "required" | "normal" | "optional") || "normal");
          setQuantity(item.quantity);
          setEstimatedUnitCost(String(Math.round(parseFloat(item.estimatedUnitCost || "0"))));
          setIsIncluded(item.isIncluded);
          setErrors({});
          setEditOpen(true);
        }}
        aria-label={`Ubah item ${item.name}`}
        title="Ubah item"
        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
      >
        <Pencil size={13} />
      </button>

      {/* Tombol Hapus */}
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        aria-label={`Hapus item ${item.name}`}
        title="Hapus item"
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
      >
        <Trash2 size={13} />
      </button>

      {/* Modal Hapus */}
      <ConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus item kebutuhan?"
        description={`Item "${item.name}" akan dihapus dari skenario ini. Anda dapat menambahkannya kembali nanti.`}
        confirmLabel="Hapus item"
        variant="destructive"
        onConfirm={handleDelete}
        loading={isDeleting}
      />

      {/* Modal Ubah Item */}
      <DialogPrimitive.Root open={editOpen} onOpenChange={setEditOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
              "rounded-xl border border-slate-200 bg-white p-6 shadow-xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <DialogPrimitive.Title className="text-base font-semibold text-slate-900">
                Ubah Item Kebutuhan
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Tutup"
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>

            <DialogPrimitive.Description className="mt-1 text-xs text-slate-500">
              Perbarui rincian estimasi kuantitas dan harga satuan item.
            </DialogPrimitive.Description>

            <form onSubmit={handleSaveEdit} className="mt-4 flex flex-col gap-4">
              {/* Nama */}
              <div className="flex flex-col gap-1">
                <label htmlFor={`edit-name-${item.id}`} className="text-sm font-medium text-slate-700">
                  Nama kebutuhan <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                <input
                  id={`edit-name-${item.id}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              {/* Kategori & Prioritas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor={`edit-cat-${item.id}`} className="text-sm font-medium text-slate-700">
                    Kategori
                  </label>
                  <input
                    id={`edit-cat-${item.id}`}
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Logistik, Konsumsi"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor={`edit-pri-${item.id}`} className="text-sm font-medium text-slate-700">
                    Prioritas
                  </label>
                  <select
                    id={`edit-pri-${item.id}`}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "required" | "normal" | "optional")}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="required">Wajib (Kritis)</option>
                    <option value="normal">Normal</option>
                    <option value="optional">Opsional</option>
                  </select>
                </div>
              </div>

              {/* Qty & Unit Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor={`edit-qty-${item.id}`} className="text-sm font-medium text-slate-700">
                    Kuantitas <span className="text-red-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id={`edit-qty-${item.id}`}
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.quantity && <p className="text-xs text-red-600">{errors.quantity}</p>}
                </div>
                <div>
                  <RupiahInput
                    id={`edit-cost-${item.id}`}
                    label="Biaya satuan"
                    value={estimatedUnitCost}
                    onChange={setEstimatedUnitCost}
                    error={errors.estimatedUnitCost}
                    required
                  />
                </div>
              </div>

              {/* Status Aktif dalam skenario */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id={`edit-inc-${item.id}`}
                  type="checkbox"
                  checked={isIncluded}
                  onChange={(e) => setIsIncluded(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`edit-inc-${item.id}`} className="text-sm text-slate-700">
                  Sertakan item ini dalam perhitungan total skenario
                </label>
              </div>

              {/* Tombol Simpan / Batal */}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={isUpdating}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
                >
                  {isUpdating ? "Menyimpan..." : "Simpan perubahan"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
