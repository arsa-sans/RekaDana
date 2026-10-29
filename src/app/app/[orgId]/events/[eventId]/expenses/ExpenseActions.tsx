"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";
import { formatRupiah } from "@/lib/utils";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

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
  const numRequested = parseFloat(requestedAmount) || 0;
  const numApproved = parseFloat(approvedAmount) || 0;
  const isApprovedOverRequested = numApproved > numRequested;

  function handleApprove() {
    if (numApproved <= 0) {
      toast({ variant: "error", title: "Nominal disetujui harus lebih dari 0." });
      return;
    }
    if (isApprovedOverRequested) {
      toast({
        variant: "error",
        title: `Nominal yang disetujui tidak boleh melebihi nominal diajukan (${formatRupiah(numRequested)}).`,
      });
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/expense-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedAmount: numApproved.toString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: json.error?.message ?? "Gagal menyetujui permintaan." });
        return;
      }
      toast({ variant: "success", title: "Permintaan pengeluaran berhasil disetujui." });
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
      toast({ variant: "success", title: "Permintaan pengeluaran berhasil ditolak." });
      setShowRejectModal(false);
      router.refresh();
    });
  }

  if (!isBendahara || isSelf) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowApproveModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#153D35] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#1A4D43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] transition-colors"
        >
          <CheckCircle size={15} className="text-[#35B88A]" />
          Setujui Pengeluaran
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 bg-white hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
        >
          <XCircle size={15} className="text-red-600" />
          Tolak
        </button>
      </div>

      <ConfirmModal
        open={showApproveModal}
        onOpenChange={setShowApproveModal}
        title="Setujui Permintaan Pengeluaran"
        description={`Nominal diajukan pemohon: ${formatRupiah(numRequested)}. Tentukan nominal resmi yang disetujui untuk pengeluaran ini.`}
        confirmLabel={isPending ? "Menyetujui..." : "Konfirmasi Persetujuan"}
        cancelLabel="Batal"
        onConfirm={handleApprove}
        loading={isPending}
        variant="default"
      >
        <div className="flex flex-col gap-3">
          <RupiahInput
            id="approvedAmount"
            label="Nominal Disetujui"
            value={approvedAmount}
            onChange={setApprovedAmount}
            required
          />
          {isApprovedOverRequested && (
            <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={14} className="shrink-0 text-red-600" />
              <span>
                Nominal tidak boleh melebihi pengajuan awal ({formatRupiah(numRequested)}).
              </span>
            </div>
          )}
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        title="Tolak Permintaan Pengeluaran"
        description="Berikan alasan penolakan yang objektif dan jelas agar pemohon dapat memperbaiki atau meninjau kembali pengajuan."
        confirmLabel={isPending ? "Menolak..." : "Konfirmasi Penolakan"}
        cancelLabel="Batal"
        onConfirm={handleReject}
        loading={isPending}
        variant="destructive"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="rejectReasonModal" className="text-sm font-semibold text-slate-800">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-xs ${
                rejectReason.trim().length >= 5 ? "text-emerald-700 font-medium" : "text-slate-400"
              }`}
            >
              {rejectReason.trim().length}/5 karakter minimum
            </span>
          </div>
          <textarea
            id="rejectReasonModal"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Jelaskan alasan penolakan secara spesifik..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          />
        </div>
      </ConfirmModal>
    </>
  );
}
