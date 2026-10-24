"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RupiahInput } from "@/components/ui/RupiahInput";
import { useToast } from "@/components/ui/Toast";

/**
 * Halaman login: form minimal, tidak ada elemen dekoratif yang tidak perlu.
 * Tombol CTA spesifik ke aksi ("Masuk ke akun") bukan generic "Login" (R-15).
 */
export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; root?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: typeof errors = {};
    if (!email) next.email = "Alamat email wajib diisi.";
    if (!password) next.password = "Kata sandi wajib diisi.";
    if (Object.keys(next).length) { setErrors(next); return; }

    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            setErrors({ root: "Email atau kata sandi salah." });
          } else if (data.errors) {
            setErrors(data.errors);
          } else {
            setErrors({ root: data.message ?? "Gagal masuk. Coba lagi." });
          }
          return;
        }

        router.replace("/app");
      } catch {
        setErrors({ root: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." });
      }
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / identitas produk */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-indigo-700 tracking-tight">RekaDana</span>
          <p className="mt-1 text-sm text-slate-500">Masuk ke akun organisasi Anda</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm"
          aria-label="Form masuk"
        >
          {errors.root && (
            <div role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {errors.root}
            </div>
          )}

          <div className="flex flex-col gap-5">
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

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Kata sandi <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={!!errors.password}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent aria-[invalid=true]:border-red-400"
                placeholder="Minimal 8 karakter"
              />
              {errors.password && (
                <p id="password-error" role="alert" className="text-xs text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Memverifikasi..." : "Masuk ke akun"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Belum punya akun?{" "}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:rounded focus-visible:ring-1 focus-visible:ring-indigo-500">
              Daftar di sini
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
