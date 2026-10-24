"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Plus, Send } from "lucide-react";
import Link from "next/link";

interface Props {
  scenarioId: string;
  isDeficit: boolean;
  orgId: string;
  eventId: string;
}

/**
 * Aksi pada setiap skenario: tambah item dan ajukan ke Bendahara.
 * Ajukan diblokir di UI jika defisit (proteksi tambahan, server tetap memvalidasi).
 */
export function ScenarioActions({ scenarioId, isDeficit, orgId, eventId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/budget-scenarios/${scenarioId}/submit`, {
          method: "POST",
        });
        const data = await res.json();

        if (!res.ok) {
          toast({ variant: "error", title: "Pengajuan gagal", description: data.message });
          setConfirmOpen(false);
          return;
        }

        toast({
          variant: "success",
          title: "Skenario berhasil diajukan",
          description: `Versi anggaran #${data.data.versionNumber} menunggu persetujuan Bendahara.`,
        });
        setConfirmOpen(false);
        router.refresh();
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/app/${orgId}/events/${eventId}/scenarios/${scenarioId}/add-item`}
        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Plus size={13} />
        Tambah item
      </Link>

      <button
        onClick={() => setConfirmOpen(true)}
        disabled={isDeficit}
        title={isDeficit ? "Total melebihi pagu dana. Kurangi estimasi sebelum mengajukan." : "Ajukan skenario ini ke Bendahara"}
        className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={13} />
        Ajukan
      </button>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ajukan skenario sebagai versi anggaran"
        description="Skenario ini akan dibekukan menjadi snapshot anggaran dan dikirim ke Bendahara untuk disetujui. Item yang tidak aktif tidak akan disertakan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, ajukan"
        onConfirm={handleSubmit}
        loading={isPending}
      />
    </div>
  );
}
