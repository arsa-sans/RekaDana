"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function NewOrganizationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; slug?: string; root?: string }>({});

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = "Nama organisasi wajib diisi.";
    if (!slug.trim()) nextErrors.slug = "Slug organisasi wajib diisi.";
    else if (!/^[a-z0-9-]+$/.test(slug)) {
      nextErrors.slug = "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
        });
        const resData = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setErrors({ slug: "Slug organisasi ini sudah digunakan. Silakan gunakan slug lain." });
          } else if (resData.errors) {
            setErrors(resData.errors);
          } else {
            setErrors({ root: resData.message ?? "Gagal membuat organisasi. Silakan coba lagi." });
          }
          return;
        }

        toast({
          title: "Organisasi Dibuat",
          description: `Organisasi ${resData.data.organization.name} berhasil dibuat.`,
          variant: "success",
        });

        router.push(`/app/${resData.data.organization.id}/dashboard`);
      } catch {
        setErrors({ root: "Tidak dapat terhubung ke server. Periksa jaringan internet Anda." });
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6">
          <Link
            href="/app?select=true"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
          >
            <ArrowLeft size={16} />
            Kembali ke Daftar Organisasi
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Buat Organisasi Baru</h1>
              <p className="text-xs text-slate-500">Anda akan otomatis menjadi Ketua Kegiatan pada organisasi ini</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {errors.root && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {errors.root}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-name" className="text-sm font-medium text-slate-700">
                Nama Organisasi <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: OSIS SMK Negeri 1 Cibinong"
                aria-describedby={errors.name ? "name-error" : undefined}
                aria-invalid={!!errors.name}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-emerald-700 aria-[invalid=true]:border-red-400"
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-xs text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="org-slug" className="text-sm font-medium text-slate-700">
                Slug / Tautan Unik <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <div className="flex items-center rounded-md border border-slate-300 bg-slate-50 px-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-emerald-700">
                <span className="text-xs font-medium text-slate-400">/</span>
                <input
                  id="org-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="osis-smkn1"
                  aria-describedby={errors.slug ? "slug-error" : undefined}
                  aria-invalid={!!errors.slug}
                  className="w-full bg-transparent py-2 pl-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              {errors.slug && (
                <p id="slug-error" role="alert" className="text-xs text-red-600">
                  {errors.slug}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Digunakan untuk identifikasi unik URL organisasi.
              </p>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/app?select=true"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-60"
              >
                {isPending ? "Menyimpan..." : "Buat Organisasi Sekarang"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
