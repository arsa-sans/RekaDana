import { cn } from "@/lib/utils";

/**
 * States universal: loading skeleton, empty, error, dan forbidden.
 * Setiap state menjelaskan penyebab dan tindakan berikutnya (R-27).
 */

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-100", className)}
      aria-busy="true"
      aria-label="Memuat data..."
    />
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <LoadingSkeleton className="h-4 flex-1" />
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Gagal memuat data",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-100 bg-red-50 px-6 py-8 text-center"
    >
      <p className="font-medium text-red-700">{title}</p>
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function ForbiddenState() {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-amber-100 bg-amber-50 px-6 py-8 text-center"
    >
      <p className="font-medium text-amber-700">Akses ditolak</p>
      <p className="text-sm text-amber-600">
        Anda tidak memiliki izin untuk melihat halaman ini. Hubungi Ketua Kegiatan jika Anda yakin ini adalah kesalahan.
      </p>
    </div>
  );
}
