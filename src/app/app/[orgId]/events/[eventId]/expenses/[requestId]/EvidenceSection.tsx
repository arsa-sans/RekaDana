"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Paperclip, UploadCloud, Download, FileText, Image as ImageIcon } from "lucide-react";
import { formatWaktu } from "@/lib/utils";

interface EvidenceItem {
  id: string;
  originalFileName: string;
  detectedFileType: string;
  fileSizeBytes: number;
  createdAt: Date | string;
}

interface Props {
  organizationId: string;
  expenseRequestId: string;
  items: EvidenceItem[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceSection({ organizationId, expenseRequestId, items }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const MAX_CLIENT_SIZE = 5_242_880; // 5 MiB, harus sinkron dengan server

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_CLIENT_SIZE) {
        toast({ variant: "error", title: "Ukuran file melebihi batas 5 MiB. Pilih file yang lebih kecil." });
        return;
      }
      setSelectedFile(file);
    }
  }

  function handleUpload() {
    if (!selectedFile) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("organizationId", organizationId);
      formData.append("expenseRequestId", expenseRequestId);

      try {
        const res = await fetch("/api/v1/evidence", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          toast({ variant: "error", title: json.error?.message ?? "Gagal mengunggah bukti." });
          return;
        }

        toast({ variant: "success", title: "Bukti transaksi berhasil diunggah." });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch {
        toast({ variant: "error", title: "Terjadi kesalahan saat mengunggah file." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Bukti Transaksi / Nota</h2>
        </div>
        <span className="text-xs text-slate-400">{items.length} file</span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Belum ada nota atau bukti yang dilampirkan.</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {item.detectedFileType === "pdf" ? (
                  <FileText size={16} className="text-red-500 shrink-0" />
                ) : (
                  <ImageIcon size={16} className="text-blue-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{item.originalFileName}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatBytes(item.fileSizeBytes)} • {formatWaktu(item.createdAt)}
                  </p>
                </div>
              </div>
              <a
                href={`/api/v1/evidence/${item.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-3 focus-visible:outline-none focus-visible:underline"
              >
                <Download size={13} />
                Unduh
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Upload Box */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-600">Lampirkan bukti baru (PDF, JPG, PNG maks 5 MiB)</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
            onChange={handleFileChange}
            className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <UploadCloud size={13} />
              {isPending ? "Mengunggah..." : "Unggah"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
