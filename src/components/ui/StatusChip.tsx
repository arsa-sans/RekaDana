import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * StatusChip: selalu menyertakan label teks (DESIGN.md).
 * Warna tidak pernah berdiri sendiri sebagai satu-satunya penanda (R-25).
 */
const chipVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        draft:     "bg-zinc-100 text-zinc-600",
        submitted: "bg-blue-50 text-blue-700",
        approved:  "bg-green-50 text-green-700",
        rejected:  "bg-red-50 text-red-700",
        partially_paid: "bg-amber-50 text-amber-700",
        paid:      "bg-cyan-50 text-cyan-700",
        cancelled: "bg-rose-50 text-rose-800",
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
  partially_paid: "Dibayar sebagian",
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
