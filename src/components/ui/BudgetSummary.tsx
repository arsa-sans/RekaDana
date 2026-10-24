import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/utils";

/**
 * BudgetSummary: kartu empat metrik finansial.
 * Tampil dalam satu baris di desktop, dua kolom di tablet, satu kolom di hp.
 * Angka negatif ditampilkan eksplisit dengan warna merah (DESIGN.md poin 4).
 */
interface BudgetSummaryProps {
  approvedBudgetTotal: string;
  actualNet: string;
  openCommitments: string;
  remainingControlBudget: string;
  className?: string;
}

interface MetricCardProps {
  label: string;
  value: string;
  isNegative?: boolean;
  description?: string;
}

function MetricCard({ label, value, isNegative, description }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums",
          isNegative ? "text-red-600" : "text-slate-900"
        )}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </span>
      {description && (
        <span className="text-xs text-slate-400">{description}</span>
      )}
    </div>
  );
}

export function BudgetSummary({
  approvedBudgetTotal,
  actualNet,
  openCommitments,
  remainingControlBudget,
  className,
}: BudgetSummaryProps) {
  const remaining = parseFloat(remainingControlBudget);
  const isDeficit = remaining < 0;

  return (
    <div
      className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}
      role="region"
      aria-label="Ringkasan anggaran"
    >
      <MetricCard
        label="Anggaran disetujui"
        value={formatRupiah(approvedBudgetTotal)}
        description="Total versi anggaran aktif"
      />
      <MetricCard
        label="Realisasi bersih"
        value={formatRupiah(actualNet)}
        description="Pembayaran dikurangi reversal"
      />
      <MetricCard
        label="Komitmen terbuka"
        value={formatRupiah(openCommitments)}
        description="Disetujui, belum sepenuhnya dibayar"
      />
      <MetricCard
        label="Sisa kontrol"
        value={formatRupiah(remainingControlBudget)}
        isNegative={isDeficit}
        description={isDeficit ? "Anggaran melewati batas" : "Dana yang masih tersedia"}
      />
    </div>
  );
}
