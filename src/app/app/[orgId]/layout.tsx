import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { requireMembership } from "@/server/authorization/tenant";
import { db } from "@/server/db";
import { organizations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { Sidebar, buildNavItems } from "@/components/layout/Sidebar";
import { Users, ShieldAlert } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgId: string; eventId?: string }>;
}

/**
 * Layout shell untuk /app/[orgId]/...
 * Mengelola otorisasi tenant membership dan navigasi sidebar sesuai role.
 */
export default async function OrgLayout({ children, params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId } = await params;

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(session.user.id, orgId);
  } catch (error: any) {
    const isInactive = error?.code === "MEMBERSHIP_INACTIVE";
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {isInactive ? (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm"
            >
              <div className="rounded-full bg-amber-100 p-3 text-amber-800">
                <Users size={32} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-amber-950">Keanggotaan Dinonaktifkan</h1>
                <p className="mt-2 text-sm text-amber-800">
                  Status keanggotaan Anda pada organisasi ini sedang dinonaktifkan. Silakan hubungi Ketua Kegiatan untuk mengaktifkannya kembali.
                </p>
              </div>
              <Link
                href="/app?select=true"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                Pilih organisasi lain
              </Link>
            </div>
          ) : (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm"
            >
              <div className="rounded-full bg-red-100 p-3 text-red-800">
                <ShieldAlert size={32} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-red-950">Akses Ditolak</h1>
                <p className="mt-2 text-sm text-red-700">
                  Anda tidak terdaftar sebagai anggota pada organisasi ini atau tidak memiliki izin akses.
                </p>
              </div>
              <Link
                href="/app?select=true"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                Kembali ke daftar organisasi
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(and(eq(organizations.id, orgId), eq(organizations.isActive, true)))
    .limit(1);

  if (!org) redirect("/app?select=true");

  const navItems = buildNavItems(orgId, undefined, membership.role);

  async function handleLogout() {
    "use server";
    const { clearSessionCookie, deleteSession, getSession } = await import("@/server/auth/session");
    const active = await getSession();
    if (active) {
      await deleteSession(active.sessionToken);
    }
    await clearSessionCookie();
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        orgName={org.name}
        orgSlug={org.slug}
        userName={session.user.name}
        role={membership.role}
        items={navItems}
        onLogout={handleLogout}
      />
      {/* Konten utama: padding kiri = lebar sidebar di layar besar */}
      <div className="flex-1 lg:pl-60">
        <main className="min-h-dvh px-4 py-6 pt-16 sm:px-6 lg:px-8 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
