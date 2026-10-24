import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { db } from "@/server/db";
import { organizations, memberships } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Halaman /app: daftar organisasi yang diikuti pengguna.
 * Jika belum login, redirect ke /login.
 * Jika tidak ada organisasi, tampilkan empty state dengan CTA nyata (R-27).
 */
export default async function AppIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.isActive, true), eq(organizations.isActive, true)));

  const ROLE_LABEL: Record<string, string> = {
    ketua_kegiatan: "Ketua Kegiatan",
    bendahara: "Bendahara",
    panitia_anggota: "Panitia Anggota",
  };

  return (
    <main className="flex min-h-dvh flex-col bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="block text-2xl font-bold text-indigo-700 tracking-tight">RekaDana</span>
            <p className="mt-1 text-sm text-slate-500">
              Selamat datang, <span className="font-medium text-slate-700">{session.user.name}</span>
            </p>
          </div>
          <Link
            href="/app/new-org"
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Plus size={15} />
            Organisasi baru
          </Link>
        </div>

        {orgs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 text-slate-300" size={40} />
            <p className="font-medium text-slate-700">Belum ada organisasi</p>
            <p className="mt-1 text-sm text-slate-500">
              Buat organisasi pertama Anda atau minta Ketua Kegiatan untuk menambahkan Anda sebagai anggota.
            </p>
            <Link
              href="/app/new-org"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Plus size={15} />
              Buat organisasi
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" role="list">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/app/${org.id}/dashboard`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                        {org.name}
                      </p>
                      <p className="text-xs text-slate-500">/{org.slug}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                    {ROLE_LABEL[org.role] ?? org.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
