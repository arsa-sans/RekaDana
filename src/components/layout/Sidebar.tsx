"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  FileCheck,
  Receipt,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar navigasi utama. Tampil sebagai drawer di layar < lg, sidebar tetap di lg ke atas.
 * Setiap item nav hanya ditampilkan jika ada destination yang nyata (R-24).
 * Role-based filtering dilakukan di luar komponen ini via prop `items`.
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  orgName: string;
  orgSlug: string;
  userName: string;
  role: string;
  items: NavItem[];
  onLogout: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  ketua_kegiatan: "Ketua Kegiatan",
  bendahara:      "Bendahara",
  panitia_anggota: "Panitia Anggota",
};

export function Sidebar({ orgName, orgSlug, userName, role, items, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Tutup drawer saat navigasi berubah.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Tutup drawer saat klik di luar area sidebar.
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && e.target === overlayRef.current) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [mobileOpen]);

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header organisasi */}
      <Link
        href="/app?select=true"
        title="Pilih atau ganti organisasi"
        className="group flex items-center justify-between border-b border-indigo-800 px-4 py-3.5 hover:bg-indigo-900/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white group-hover:text-indigo-200">{orgName}</p>
            <p className="text-xs text-indigo-300">/{orgSlug}</p>
          </div>
        </div>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-xs text-indigo-300 group-hover:text-white group-hover:bg-indigo-800 transition-colors">
          Ganti
        </span>
      </Link>

      {/* Menu navigasi */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
        <ul className="flex flex-col gap-0.5" role="list">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer pengguna */}
      <div className="border-t border-indigo-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-indigo-300">{ROLE_LABEL[role] ?? role}</p>
          </div>
          <button
            onClick={onLogout}
            className="shrink-0 rounded p-1.5 text-indigo-300 hover:bg-indigo-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            aria-label="Keluar dari akun"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Tombol buka sidebar untuk layar kecil */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 flex items-center justify-center rounded-md bg-indigo-950 p-2 text-white shadow-md lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label="Buka menu navigasi"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar mobile: drawer dari kiri */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 rounded p-1.5 text-indigo-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </div>

      {/* Sidebar desktop: tetap di kiri */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col bg-indigo-950">
        {sidebarContent}
      </aside>
    </>
  );
}

/**
 * Fungsi pembantu untuk menghasilkan daftar item nav sesuai role.
 * Item hanya ditampilkan jika fitur sudah ada (R-24).
 */
export function buildNavItems(
  orgId: string,
  eventId: string | undefined,
  role: string
): NavItem[] {
  const base = `/app/${orgId}`;
  const eventBase = eventId ? `${base}/events/${eventId}` : null;

  const items: NavItem[] = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  ];

  if (eventBase) {
    items.push(
      { href: `${eventBase}/scenarios`, label: "Scenario Lab", icon: <FlaskConical size={16} /> },
      { href: `${eventBase}/expenses`, label: "Pengeluaran", icon: <Receipt size={16} /> },
    );

    if (role === "bendahara") {
      items.push(
        { href: `${eventBase}/budgets`, label: "Review Anggaran", icon: <FileCheck size={16} /> },
      );
    }

    items.push(
      { href: `${eventBase}/reports`, label: "Laporan", icon: <FileText size={16} /> },
    );
  }

  if (role === "ketua_kegiatan") {
    items.push(
      { href: `${base}/members`, label: "Anggota", icon: <Users size={16} /> },
    );
  }

  return items;
}
