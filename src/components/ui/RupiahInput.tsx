import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/utils";

/**
 * RupiahInput: field angka nominal Rupiah dengan keyboard numerik di mobile.
 * Nilai disimpan sebagai string desimal agar konsisten dengan format API.
 * Error dari server ditampilkan di bawah field dan dikaitkan ke input via aria-describedby.
 */
interface RupiahInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function RupiahInput({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  required,
  placeholder = "0",
}: RupiahInputProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ") || undefined;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw ? String(parseInt(raw, 10)) : "");
  }

  const displayValue = value ? parseInt(value, 10).toLocaleString("id-ID") : "";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
      </label>

      <div
        className={cn(
          "flex items-center rounded-md border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500",
          error ? "border-red-400" : "border-slate-300",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50"
        )}
      >
        <span className="mr-1.5 text-slate-400 text-sm select-none">Rp</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className="flex-1 bg-transparent text-sm font-mono text-slate-900 outline-none placeholder:text-slate-400 tabular-nums"
        />
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
