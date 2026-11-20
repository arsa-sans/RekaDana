"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard tidak tersedia di semua browser
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} tersalin` : `Salin ${label}`}
      className="p-1 rounded transition-colors text-[#64748B] hover:text-[#153D35]"
    >
      {copied ? (
        <Check size={14} aria-hidden="true" className="text-[#153D35]" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
    </button>
  );
}
