"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  versionId: string;
  versionNumber: number;
  submittedBy: string | null;
  currentUserId: string;
}

/**
 * Tombol approve dan reject untuk Bendahara.
 * Self-approval diblokir di server; UI menampilkan pesan yang jelas jika terjadi.
 */
export function BudgetVersionActions({ versionId, versionNumber, submittedBy, currentUserId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isSelf = submittedBy === currentUserId;

  function handleApprove() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/budget-versions/${versionId}/approve`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast({ variant: "error", title: "Persetujuan gagal", description: data.message });
          setApproveOpen(false);
          return;
        }
        toast({ variant: "success", title: `Versi #${versionNumber} disetujui`, description: "Anggaran sekarang aktif sebagai acuan pengeluaran." });
        setApproveOpen(false);
        router.refresh();
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  function handleReject() {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setReasonError("Alasan penolakan wajib diisi minimal 5 karakter.");
      return;
    }
    setReasonError("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/budget-versions/${versionId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({ variant: "error", title: "Penolakan gagal", description: data.message });
          setRejectOpen(false);
          return;
        }
        toast({ variant: "info", title: `Versi #${versionNumber} ditolak`, description: "Pengaju dapat memperbaiki skenario dan mengajukan ulang." });
        setRejectOpen(false);
        setRejectReason("");
        router.refresh();
      } catch {
        toast({ variant: "error", title: "Gagal terhubung ke server" });
      }
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setRejectOpen(true)}
          disabled={isSelf}
          title={isSelf ? "Anda tidak dapat menolak pengajuan Anda sendiri." : "Tolak versi ini"}
          className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <XCircle size={13} />
          Tolak
        </button>
        <button
          onClick={() => setApproveOpen(true)}
          disabled={isSelf}
          title={isSelf ? "Anda tidak dapat menyetujui pengajuan Anda sendiri." : "Setujui versi ini"}
          className="flex items-center gap-1 rounded-[6px] bg-[#153D35] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1A4D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle size={13} />
          Setujui
        </button>
      </div>

      {isSelf && (
        <p className="mt-1 text-xs text-amber-600 text-right">
          Anda mengajukan versi ini. Prinsip pemisahan tugas: Bendahara lain harus menyetujui.
        </p>
      )}

      {/* Modal Setujui */}
      <ConfirmModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={`Setujui Versi Anggaran #${versionNumber}`}
        description="Anggaran ini akan diaktifkan sebagai acuan pengeluaran resmi. Versi sebelumnya yang aktif akan diarsipkan. Tindakan ini tercatat dalam log audit."
        confirmLabel="Setujui anggaran"
        onConfirm={handleApprove}
        loading={isPending}
      />

      {/* Modal Tolak */}
      <ConfirmModal
        open={rejectOpen}
        onOpenChange={(open) => { setRejectOpen(open); if (!open) { setRejectReason(""); setReasonError(""); } }}
        title={`Tolak Versi Anggaran #${versionNumber}`}
        description="Pengaju akan mengetahui alasan penolakan dan dapat memperbaiki skenario. Alasan akan dicatat dalam log audit."
        confirmLabel="Tolak anggaran"
        cancelLabel="Batal"
        onConfirm={handleReject}
        loading={isPending}
        variant="destructive"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="reject-reason" className="text-sm font-medium text-slate-700">
            Alasan penolakan <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            aria-describedby={reasonError ? "reason-error" : undefined}
            aria-invalid={!!reasonError}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none aria-[invalid=true]:border-red-400"
            placeholder="Jelaskan mengapa versi anggaran ini ditolak..."
          />
          {reasonError && (
            <p id="reason-error" role="alert" className="text-xs text-red-600">{reasonError}</p>
          )}
        </div>
      </ConfirmModal>
    </>
  );
}
