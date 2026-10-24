import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format angka desimal string dari API ke tampilan Rupiah. */
export function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Rp0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/** Format tanggal ISO ke format lokal Jakarta. */
export function formatTanggal(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    ...options,
  }).format(date);
}

/** Format tanggal+waktu. */
export function formatWaktu(value: string | Date | null | undefined): string {
  return formatTanggal(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

/** Tampilkan bilangan selisih dengan tanda + atau - yang eksplisit. */
export function formatSelisih(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  const formatted = Math.abs(num).toLocaleString("id-ID");
  return num >= 0 ? `+Rp${formatted}` : `-Rp${formatted}`;
}
