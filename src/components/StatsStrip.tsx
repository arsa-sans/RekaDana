// Section baru: highlight atribut nyata produk antara Hero dan Fitur
// Alasan keberadaan: bridging visual dari Hero gelap ke Features terang,
// dan menyampaikan 4 fakta produk tanpa statistik palsu (R-17).

import AnimateIn from "@/components/AnimateIn";
import { Smartphone, Users, FileText, Calendar } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Smartphone, label: "Aplikasi Android", sub: "Android 7.0 (API 24+)", tag: "Mobile" },
  { icon: Users, label: "3 Peran Pengguna", sub: "Ketua, Bendahara, Anggota", tag: "Struktur" },
  { icon: FileText, label: "6 Fitur Utama", sub: "Anggaran hingga Laporan", tag: "Alur" },
  { icon: Calendar, label: "Multi-Kegiatan", sub: "Satu organisasi, banyak event", tag: "Manajemen" },
];

export default function StatsStrip() {
  return (
    <section
      className="py-8 bg-white border-y border-[#D1E8DF]"
      aria-label="Ringkasan produk"
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {HIGHLIGHTS.map(({ icon: Icon, label, sub, tag }, i) => (
            <AnimateIn key={label} delay={i * 0.08} direction="up">
              <div className="p-3.5 rounded-[8px] bg-[#F6F8F7] border border-[#D1E8DF]/70 hover:border-[#35B88A] hover:bg-[#EAF5F0]/30 transition-all duration-200 flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: "#EAF5F0" }}
                >
                  <Icon size={18} className="text-[#153D35]" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-[#153D35] truncate">{label}</p>
                  </div>
                  <p className="text-xs mt-0.5 text-[#64748B] leading-tight">{sub}</p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
