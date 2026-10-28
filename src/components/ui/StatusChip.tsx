import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * StatusChip: selalu menyertakan label teks (DESIGN.md).
 * Warna tidak pernah berdiri sendiri sebagai satu-satunya penanda (R-25).
 * Nilai kontras diverifikasi memenuhi standar WCAG AA.
 */
const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-[6px] px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      status: {
        draft:          "bg-[#F1F5F9] text-[#475569]",
        submitted:      "bg-[#DBEAFE] text-[#1E40AF]",
        approved:       "bg-[#D1FAE5] text-[#065F46]",
        rejected:       "bg-[#FEE2E2] text-[#991B1B]",
        partially_paid: "bg-[#FEF3C7] text-[#92400E]",
        paid:           "bg-[#EAF5F0] text-[#153D35]",
        cancelled:      "bg-[#F1F5F9] text-[#6B7280]",
      },
    },
    defaultVariants: {
      status: "draft",
    },
  }
);

type Status = "draft" | "submitted" | "approved" | "rejected" | "partially_paid" | "paid" | "cancelled";

const STATUS_LABEL: Record<Status, string> = {
  draft:          "Draf",
  submitted:      "Diajukan",
  approved:       "Disetujui",
  rejected:       "Ditolak",
  partially_paid: "Sebagian Lunas",
  paid:           "Lunas",
  cancelled:      "Dibatalkan",
};

interface StatusChipProps extends VariantProps<typeof chipVariants> {
  status: Status;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <span className={cn(chipVariants({ status }), className)} aria-label={STATUS_LABEL[status]}>
      <span className="sr-only">Status:</span>
      {STATUS_LABEL[status]}
    </span>
  );
}
