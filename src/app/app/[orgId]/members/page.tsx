import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { requireMembership } from "@/server/authorization/tenant";
import { ForbiddenState, EmptyState } from "@/components/ui/States";
import { db } from "@/server/db";
import { memberships, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { AddMemberForm } from "./AddMemberForm";

interface Props {
  params: Promise<{ orgId: string }>;
}

const ROLE_LABELS: Record<string, string> = {
  ketua_kegiatan: "Ketua Kegiatan",
  bendahara: "Bendahara",
  panitia_anggota: "Panitia Anggota",
};

export default async function MembersPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { orgId } = await params;

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  try {
    membership = await requireMembership(session.user.id, orgId);
  } catch {
    return <ForbiddenState />;
  }

  const isKetua = membership.role === "ketua_kegiatan";

  const members = await db
    .select({
      id: memberships.id,
      role: memberships.role,
      joinedAt: memberships.createdAt,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organizationId, orgId))
    .orderBy(memberships.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Anggota Organisasi</h1>
        <p className="text-sm text-slate-500">
          Daftar anggota dan peran mereka dalam organisasi ini.
        </p>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={40} className="text-slate-300" />}
          title="Belum ada anggota"
          description="Tambahkan anggota pertama untuk mulai berkolaborasi."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Peran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {m.name}
                    {m.userId === session.user.id && (
                      <span className="ml-2 text-xs text-indigo-500 font-normal">(Anda)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isKetua && <AddMemberForm orgId={orgId} />}
    </div>
  );
}
