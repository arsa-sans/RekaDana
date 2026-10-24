"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string; root?: string;
  }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) next.name = "Nama minimal 2 karakter.";
    if (!email) next.email = "Alamat email wajib diisi.";
    if (!password || password.length < 8) next.password = "Kata sandi minimal 8 karakter.";
    if (Object.keys(next).length) { setErrors(next); return; }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setErrors({ email: "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain." });
          } else if (data.errors) {
            setErrors(data.errors);
          } else {
            setErrors({ root: data.message ?? "Pendaftaran gagal. Coba lagi." });
          }
          return;
        }

        toast({ variant: "success", title: "Akun berhasil dibuat", description: "Anda telah masuk secara otomatis." });
        router.replace("/app");
      } catch {
        setErrors({ root: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." });
      }
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-indigo-700 tracking-tight">RekaDana</span>
          <p className="mt-1 text-sm text-slate-500">Buat akun untuk mulai mengelola anggaran</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm"
          aria-label="Form pendaftaran akun"
        >
          {errors.root && (
            <div role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {errors.root}
            </div>
          )}

          <div className="flex flex-col gap-5">
            {/* Nama */}
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Nama lengkap <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={errors.name ? "name-error" : undefined}
                aria-invalid={!!errors.name}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
                placeholder="Nama Anda"
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Alamat email <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={!!errors.email}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
                placeholder="nama@email.com"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Kata sandi */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Kata sandi <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="password-hint"
                aria-invalid={!!errors.password}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
                placeholder="Minimal 8 karakter"
              />
              {errors.password ? (
                <p id="password-hint" role="alert" className="text-xs text-red-600">{errors.password}</p>
              ) : (
                <p id="password-hint" className="text-xs text-slate-500">Minimal 8 karakter.</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Membuat akun..." : "Buat akun"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-indigo-500">
              Masuk di sini
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
