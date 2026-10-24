"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";

interface Props {
  requestId: string;
  requestedAmount: string;
  approvedAmount: string | null;
  requestedBy: string;
  currentUserId: string;
  isBendahara: boolean;
  orgId: string;
  eventId: string;
}

export function ExpenseActions({
  requestId,
  requestedAmount,
  approvedAmount: initialApproved,
  requestedBy,
  currentUserId,
  isBendahara,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [approvedAmount, setApprovedAmount] = useState(initialApproved ?? requestedAmount);
  const [rejectReason, setRejectReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const isSelf = requestedBy === currentUserId;

  function handleApprove() {
    startTransition(async () => {
      const res = await fetch(`/api/v1/expense-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedAmount: approvedAmount || requestedAmount,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: json.error?.message ?? "Gagal menyetujui permintaan." });
        return;
      }
      toast({ variant: "success", title: "Permintaan pengeluaran disetujui." });
      setShowApproveModal(false);
      router.refresh();
    });
  }

  function handleReject() {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast({ variant: "error", title: "Alasan penolakan wajib diisi minimal 5 karakter." });
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/v1/expense-requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: json.error?.message ?? "Gagal menolak permintaan." });
        return;
      }
      toast({ variant: "success", title: "Permintaan pengeluaran ditolak." });
      setShowRejectModal(false);
      router.refresh();
    });
  }

  if (!isBendahara || isSelf) return null;

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setShowApproveModal(true)}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          Setujui
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          Tolak
        </button>
      </div>

      <ConfirmModal
        open={showApproveModal}
        onOpenChange={setShowApproveModal}
        title="Setujui Permintaan Pengeluaran"
        description="Tentukan nominal yang disetujui. Tidak boleh melebihi nominal yang diajukan."
        confirmLabel={isPending ? "Menyetujui..." : "Setujui"}
        onConfirm={handleApprove}
        variant="default"
      >
        <RupiahInput
          id="approvedAmount"
          label="Nominal disetujui"
          value={approvedAmount}
          onChange={setApprovedAmount}
        />
      </ConfirmModal>

      <ConfirmModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        title="Tolak Permintaan Pengeluaran"
        description="Berikan alasan penolakan yang jelas agar pemohon dapat memperbaiki pengajuan."
        confirmLabel={isPending ? "Menolak..." : "Tolak"}
        onConfirm={handleReject}
        variant="destructive"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Alasan penolakan</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Jelaskan alasan penolakan secara spesifik..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      </ConfirmModal>
    </>
  );
}
