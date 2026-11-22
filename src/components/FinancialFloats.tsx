// FinancialFloats.tsx
// Dekorasi ambient bertema keuangan: koin, grafik, receipt, panah naik.
// Alasan keberadaan: mengisi ruang kosong antar section dengan elemen yang
// relevan dengan produk (R-22: ilustrasi harus punya koneksi ke konten).
// Semua animasi menggunakan CSS keyframes via Tailwind, bukan infinite JS loops
// yang membuang CPU (R-19: motion harus punya tujuan UX yang jelas).
// Elemen ini aria-hidden — murni dekoratif.

"use client";

import { useEffect, useRef, useState } from "react";

// ─── SVG Primitives ─────────────────────────────────────────────────────────

function CoinStack({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow bawah */}
      <ellipse cx="32" cy="58" rx="18" ry="4" fill="rgba(21,61,53,0.18)" />
      {/* Koin bawah */}
      <ellipse cx="32" cy="50" rx="18" ry="6" fill="#c47d1a" />
      <ellipse cx="32" cy="47" rx="18" ry="6" fill="#d4871e" />
      <ellipse cx="32" cy="44" rx="18" ry="6" fill="#e09422" />
      {/* Koin tengah */}
      <ellipse cx="32" cy="38" rx="18" ry="6" fill="#c47d1a" />
      <ellipse cx="32" cy="35" rx="18" ry="6" fill="#d4871e" />
      <ellipse cx="32" cy="32" rx="18" ry="6" fill="#e09422" />
      {/* Koin atas */}
      <ellipse cx="32" cy="26" rx="18" ry="6" fill="#c47d1a" />
      <ellipse cx="32" cy="23" rx="18" ry="6" fill="#d4871e" />
      <ellipse cx="32" cy="20" rx="18" ry="6" fill="#f5a623" />
      {/* Detail permukaan atas */}
      <ellipse cx="32" cy="20" rx="12" ry="3.5" fill="#f7b733" opacity="0.7" />
      <text
        x="32"
        y="23"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill="#c47d1a"
        fontFamily="sans-serif"
      >
        Rp
      </text>
    </svg>
  );
}

function BarChart({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid lines tipis */}
      {[14, 26, 38].map((y) => (
        <line
          key={y}
          x1="8"
          y1={y}
          x2="58"
          y2={y}
          stroke="rgba(53,184,138,0.15)"
          strokeWidth="1"
        />
      ))}
      {/* Bars */}
      <rect x="10" y="30" width="9" height="18" rx="3" fill="#1a7a5e" />
      <rect x="22" y="20" width="9" height="28" rx="3" fill="#2ea87d" />
      <rect x="34" y="12" width="9" height="36" rx="3" fill="#35b88a" />
      <rect x="46" y="6" width="9" height="42" rx="3" fill="#35b88a" />
      {/* Highlight atas bar tertinggi */}
      <rect x="46" y="6" width="9" height="5" rx="3" fill="#5dd4a0" />
      {/* Sumbu X */}
      <line x1="8" y1="49" x2="58" y2="49" stroke="rgba(53,184,138,0.3)" strokeWidth="1.5" />
      {/* Arrow up — alasan: sinyal tren naik, relevan untuk dashboard keuangan */}
      <path d="M54 2 L58 7 L56 7 L56 12 L52 12 L52 7 L50 7 Z" fill="#35b88a" />
    </svg>
  );
}

function DonutChart({ className }: { className?: string }) {
  // Donut chart sederhana: 3 segmen alokasi anggaran
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Segmen via stroke-dasharray pada lingkaran r=22 circumference≈138 */}
      <circle cx="32" cy="32" r="22" stroke="#153d35" strokeWidth="12" fill="none" />
      {/* Segmen 1: 55% = 76 dari 138 */}
      <circle
        cx="32" cy="32" r="22"
        stroke="#35b88a"
        strokeWidth="12"
        fill="none"
        strokeDasharray="76 62"
        strokeLinecap="butt"
        transform="rotate(-90 32 32)"
      />
      {/* Segmen 2: 30% = 41 */}
      <circle
        cx="32" cy="32" r="22"
        stroke="#2ea87d"
        strokeWidth="12"
        fill="none"
        strokeDasharray="41 97"
        strokeLinecap="butt"
        transform="rotate(146 32 32)"
      />
      {/* Segmen 3: 15% = 21 */}
      <circle
        cx="32" cy="32" r="22"
        stroke="#f5a623"
        strokeWidth="12"
        fill="none"
        strokeDasharray="21 117"
        strokeLinecap="butt"
        transform="rotate(253 32 32)"
      />
      {/* Label tengah */}
      <text x="32" y="30" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#35b88a" fontFamily="sans-serif">Rp</text>
      <text x="32" y="40" textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.7)" fontFamily="sans-serif">Budget</text>
    </svg>
  );
}

function Receipt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 52 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Kertas */}
      <rect x="4" y="2" width="44" height="56" rx="4" fill="rgba(230,236,233,0.12)" stroke="rgba(53,184,138,0.35)" strokeWidth="1" />
      {/* Garis-garis teks */}
      <rect x="10" y="12" width="22" height="3" rx="1.5" fill="rgba(53,184,138,0.6)" />
      <rect x="10" y="20" width="32" height="2" rx="1" fill="rgba(255,255,255,0.2)" />
      <rect x="10" y="26" width="28" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
      <rect x="10" y="32" width="30" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
      {/* Divider */}
      <line x1="10" y1="40" x2="42" y2="40" stroke="rgba(53,184,138,0.25)" strokeWidth="1" strokeDasharray="3 2" />
      {/* Total */}
      <rect x="10" y="45" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
      <rect x="30" y="45" width="12" height="3" rx="1.5" fill="#35b88a" />
      {/* Checkmark badge */}
      <circle cx="40" cy="10" r="8" fill="#35b88a" />
      <path d="M36 10 L39 13 L44 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendArrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 72 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Garis tren */}
      <polyline
        points="4,40 18,28 32,32 46,16 60,8"
        stroke="#35b88a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Area di bawah garis */}
      <path
        d="M4,40 L18,28 L32,32 L46,16 L60,8 L60,44 L4,44 Z"
        fill="url(#trendFill)"
        opacity="0.2"
      />
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35b88a" />
          <stop offset="100%" stopColor="#35b88a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Dot di titik data */}
      {[[4,40],[18,28],[32,32],[46,16],[60,8]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#35b88a" />
      ))}
      {/* Arrow head */}
      <path d="M56 4 L64 8 L60 8 L60 12" stroke="#35b88a" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Gold target */}
      <circle cx="60" cy="8" r="4" fill="#f5a623" opacity="0.9" />
      <circle cx="60" cy="8" r="2" fill="white" opacity="0.8" />
    </svg>
  );
}

// ─── Wrapper float chip ──────────────────────────────────────────────────────

interface FloatChipProps {
  children: React.ReactNode;
  label?: string;
  sublabel?: string;
  style?: React.CSSProperties;
  className?: string;
  animClass: string; // Tailwind animate-* class
  dark?: boolean;    // true = background gelap (untuk section hijau)
}

function FloatChip({ children, label, sublabel, style, className, animClass, dark }: FloatChipProps) {
  const bg = dark
    ? "rgba(14,46,39,0.88)"
    : "rgba(255,255,255,0.95)";
  const border = dark
    ? "1px solid rgba(53,184,138,0.42)"
    : "1px solid rgba(53,184,138,0.25)";

  return (
    <div
      aria-hidden="true"
      className={`absolute flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] select-none pointer-events-none ${animClass} ${className ?? ""}`}
      style={{
        background: bg,
        border,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: dark
          ? "0 8px 24px rgba(0,0,0,0.35), 0 0 16px rgba(53,184,138,0.12)"
          : "0 6px 20px rgba(21,61,53,0.08)",
        ...style,
      }}
    >
      <div className="shrink-0 w-9 h-9 flex items-center justify-center">{children}</div>
      {(label || sublabel) && (
        <div className="pr-1">
          {label && (
            <p
              className="text-xs font-bold leading-tight"
              style={{ color: dark ? "#ffffff" : "#153D35" }}
            >
              {label}
            </p>
          )}
          {sublabel && (
            <p
              className="text-[11px] leading-tight mt-0.5"
              style={{ color: dark ? "rgba(230,236,233,0.75)" : "#475569" }}
            >
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hero floats ─────────────────────────────────────────────────────────────
// Diposisikan secara lokal di dalam kolom kanan (area 3D phone),
// sehingga TIDAK AKAN PERNAH menimpa judul atau teks di kolom kiri.

export function HeroFinancialFloats() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none hidden lg:block z-20">
      {/* Koin: kiri atas phone, berada di sisi kiri container HP tapi tidak menyeberang ke kolom judul */}
      <FloatChip
        label="Anggaran Tersusun"
        sublabel="Rencana sebelum kegiatan"
        animClass="animate-float-a"
        dark
        style={{ top: "28px", left: "0px" }}
      >
        <CoinStack className="w-8 h-8" />
      </FloatChip>

      {/* Receipt: kanan atas phone */}
      <FloatChip
        label="Bukti Terlampir"
        sublabel="Setiap pengeluaran tercatat"
        animClass="animate-float-b"
        dark
        style={{ top: "16px", right: "-16px" }}
      >
        <Receipt className="w-8 h-8" />
      </FloatChip>

      {/* Trend chart: kanan bawah phone */}
      <FloatChip
        label="Laporan Otomatis"
        sublabel="Siap diekspor kapan saja"
        animClass="animate-float-c"
        dark
        style={{ bottom: "96px", right: "-12px" }}
      >
        <TrendArrow className="w-9 h-7" />
      </FloatChip>

      {/* Donut chart alokasi: kiri bawah phone */}
      <FloatChip
        label="Alokasi Transparan"
        sublabel="Realisasi dana terkontrol"
        animClass="animate-float-a"
        dark
        style={{ bottom: "60px", left: "-8px" }}
      >
        <DonutChart className="w-8 h-8" />
      </FloatChip>
    </div>
  );
}

// ─── Features section floats ──────────────────────────────────────────────────

export function FeaturesFinancialFloats() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* Chip kanan atas: Koin stack (aman, judul berada di kolom kiri) */}
      <FloatChip
        label="Kas Transparan"
        sublabel="Buku kas otomatis"
        animClass="animate-float-a"
        style={{ top: "3%", right: "4%", zIndex: 1 }}
      >
        <CoinStack className="w-8 h-8" />
      </FloatChip>

      {/* Chip kanan bawah: Bar chart */}
      <FloatChip
        label="Grafik Realisasi"
        sublabel="Pantau serapan anggaran"
        animClass="animate-float-b"
        style={{ bottom: "3%", right: "4%", zIndex: 1 }}
      >
        <BarChart className="w-9 h-7" />
      </FloatChip>
    </div>
  );
}

// ─── HowItWorks section floats ───────────────────────────────────────────────

export function HowItWorksFinancialFloats() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* Chip kanan atas: Trend growth (di atas panel simulasi kanan, judul kiri bebas) */}
      <FloatChip
        label="Alur Akuntabel"
        sublabel="Tanpa celah salah hitung"
        animClass="animate-float-b"
        style={{ top: "3%", right: "4%", zIndex: 1 }}
      >
        <TrendArrow className="w-9 h-7" />
      </FloatChip>

      {/* Chip kanan bawah: Koin */}
      <FloatChip
        label="Saldo Tercatat"
        sublabel="Real-time di smartphone"
        animClass="animate-float-c"
        style={{ bottom: "4%", right: "4%", zIndex: 1 }}
      >
        <CoinStack className="w-8 h-8" />
      </FloatChip>
    </div>
  );
}

// ─── Demo section floats ─────────────────────────────────────────────────────

export function DemoFinancialFloats() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* Donut chart chip — kanan atas (aman, judul Coba dengan akun demo berada di sisi kiri) */}
      <FloatChip
        label="Simulasi Data Kas"
        sublabel="Aman diuji coba langsung"
        animClass="animate-float-b"
        style={{ top: "3%", right: "4%", zIndex: 1 }}
      >
        <DonutChart className="w-8 h-8" />
      </FloatChip>

      {/* Receipt chip — kanan bawah */}
      <FloatChip
        label="Multi-Peran Terintegrasi"
        sublabel="Ketua, bendahara & panitia"
        animClass="animate-float-a"
        style={{ bottom: "4%", right: "4%", zIndex: 1 }}
      >
        <Receipt className="w-8 h-8" />
      </FloatChip>
    </div>
  );
}

// ─── Download section floats ─────────────────────────────────────────────────

export function DownloadFinancialFloats() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* Koin chip — kanan atas, di atas kartu panduan */}
      <FloatChip
        label="Siap Pasang di Android"
        sublabel="Format standar sekolah"
        animClass="animate-float-a"
        dark
        style={{ top: "8%", right: "4%", zIndex: 1 }}
      >
        <CoinStack className="w-8 h-8" />
      </FloatChip>

      {/* Bar chart chip — kanan bawah, di bawah kartu panduan (aman, jauh dari tombol Unduh APK di kolom kiri) */}
      <FloatChip
        label="Laporan PDF & Excel"
        sublabel="Sekali klik siap cetak"
        animClass="animate-float-c"
        dark
        style={{ bottom: "6%", right: "6%", zIndex: 1 }}
      >
        <BarChart className="w-9 h-7" />
      </FloatChip>
    </div>
  );
}
