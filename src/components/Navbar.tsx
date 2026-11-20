"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara Pakai", href: "#cara-pakai" },
  { label: "Demo", href: "#demo" },
  { label: "Unduh", href: "#unduh" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{ backgroundColor: "#153D35" }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo wordmark */}
        <a
          href="#"
          className="text-white font-bold text-lg tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#153D35] rounded"
        >
          RekaDana
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#153D35] rounded"
              style={{ color: "rgba(255,255,255,0.75)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#ffffff")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(255,255,255,0.75)")
              }
            >
              {link.label}
            </a>
          ))}
          <a
            href="#unduh"
            className="px-4 py-1.5 text-sm font-semibold rounded-[6px] transition-colors"
            style={{ backgroundColor: "#35B88A", color: "#153D35" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2EA87D")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#35B88A")
            }
          >
            Unduh APK
          </a>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A]"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          className="md:hidden border-t"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
          aria-label="Navigasi mobile"
        >
          <ul className="flex flex-col px-5 py-3 gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block py-2 text-sm font-medium rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35B88A]"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <a
                href="#unduh"
                className="block text-center py-2 text-sm font-semibold rounded-[6px]"
                style={{ backgroundColor: "#35B88A", color: "#153D35" }}
                onClick={() => setOpen(false)}
              >
                Unduh APK
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
