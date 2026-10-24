"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { UserPlus } from "lucide-react";

interface Props {
  orgId: string;
}

const ROLES = [
  { value: "ketua_kegiatan", label: "Ketua Kegiatan" },
  { value: "bendahara", label: "Bendahara" },
  { value: "panitia_anggota", label: "Panitia Anggota" },
];

export function AddMemberForm({ orgId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("panitia_anggota");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Alamat email anggota wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? "Gagal menambahkan anggota.");
        return;
      }

      toast({ variant: "success", title: `${email} berhasil ditambahkan sebagai anggota.` });
      setEmail("");
      setRole("panitia_anggota");
      setShowForm(false);
      router.refresh();
    });
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-2 self-start rounded-md border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
      >
        <UserPlus size={16} />
        Tambah Anggota
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">Tambah Anggota Baru</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="memberEmail" className="text-sm font-semibold text-slate-700">
            Alamat email <span className="text-red-500">*</span>
          </label>
          <input
            id="memberEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@contoh.com"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <p className="text-xs text-slate-400">
            Pengguna harus sudah terdaftar di sistem sebelum dapat ditambahkan.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="memberRole" className="text-sm font-semibold text-slate-700">
            Peran
          </label>
          <select
            id="memberRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {isPending ? "Menambahkan..." : "Tambah"}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setError(null); }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
