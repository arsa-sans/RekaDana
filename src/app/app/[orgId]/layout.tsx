import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireMembership } from "@/server/authorization/tenant";
import { db } from "@/server/db";
import { organizations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { Sidebar, buildNavItems } from "@/components/layout/Sidebar";
import { ForbiddenState } from "@/components/ui/States";

interface Props {
  children: React.ReactNode;
  params: Promise<{ orgId: string; eventId?: string }>;
}

/**
 * Layout shell untuk /app/[orgId]/...
 * Mengelola sidebar dengan nav item yang sesuai dengan role pengguna.
 */
export default async function OrgLayout({ children, params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId } = await params;

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(session.user.id, orgId);
  } catch {
    return (
      <div className="p-6">
        <ForbiddenState />
      </div>
    );
  }

  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(and(eq(organizations.id, orgId), eq(organizations.isActive, true)))
    .limit(1);

  if (!org) redirect("/app");

  const navItems = buildNavItems(orgId, undefined, membership.role);

  async function handleLogout() {
    "use server";
    // Server action untuk logout: dipanggil dari client melalui form action.
    const { cookies } = await import("next/headers");
    const { SESSION_COOKIE_NAME, deleteSession } = await import("@/server/auth/session");
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await deleteSession(token);
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
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
