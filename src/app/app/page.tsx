import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { db } from "@/server/db";
import { organizations, memberships } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

interface Props {
  searchParams: Promise<{ select?: string }>;
}

export default async function AppIndexPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { select } = await searchParams;

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.isActive, true),
        eq(organizations.isActive, true)
      )
    );

  // Jika pengguna hanya memiliki 1 organisasi aktif dan tidak eksplisit meminta pemilihan
  if (orgs.length === 1 && select !== "true") {
    redirect(`/app/${orgs[0].id}/dashboard`);
  }

  const ROLE_LABEL: Record<string, string> = {
    ketua_kegiatan: "Ketua Kegiatan",
    bendahara: "Bendahara",
    panitia_anggota: "Panitia Anggota",
  };

  return (
    <main className="flex min-h-dvh flex-col bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="block text-2xl font-bold text-emerald-950 tracking-tight">RekaDana</span>
            <p className="mt-1 text-sm text-slate-600">
              Selamat datang, <span className="font-semibold text-slate-800">{session.user.name}</span>
            </p>
          </div>
          <Link
            href="/app/new-org"
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-emerald-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <Plus size={16} />
            Organisasi Baru
          </Link>
        </div>

        {orgs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
              <Building2 size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Belum Ada Organisasi</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Anda belum terdaftar dalam organisasi manapun. Buat organisasi baru atau hubungi Ketua Kegiatan untuk menambahkan akun Anda.
            </p>
            <Link
              href="/app/new-org"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              <Plus size={16} />
              Buat Organisasi Sekarang
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Daftar Organisasi Anda</h2>
              <p className="text-xs text-slate-500">Pilih organisasi untuk membuka dashboard kegiatan</p>
            </div>
            <ul className="flex flex-col gap-3" role="list">
              {orgs.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/app/${org.id}/dashboard`}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200">
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 group-hover:text-emerald-900">
                          {org.name}
                        </p>
                        <p className="text-xs text-slate-500">/{org.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                        {ROLE_LABEL[org.role] ?? org.role}
                      </span>
                      <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-800" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
