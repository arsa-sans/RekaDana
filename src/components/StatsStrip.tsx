// Section baru: highlight atribut nyata produk antara Hero dan Fitur
// Alasan keberadaan: bridging visual dari Hero gelap ke Features terang,
// dan menyampaikan 4 fakta produk tanpa statistik palsu (R-17).

import AnimateIn from "@/components/AnimateIn";
import { Smartphone, Users, FileText, Calendar } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Smartphone, label: "Aplikasi Android", sub: "API 24+" },
  { icon: Users, label: "3 Peran Pengguna", sub: "Ketua, Bendahara, Anggota" },
  { icon: FileText, label: "6 Fitur Utama", sub: "Anggaran hingga Laporan" },
  { icon: Calendar, label: "Multi-Kegiatan", sub: "Satu organisasi, banyak event" },
];

export default function StatsStrip() {
  return (
    <section
      className="py-10 bg-[#F6F8F7] border-y border-[#D1E8DF]"
      aria-label="Ringkasan produk"
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {HIGHLIGHTS.map(({ icon: Icon, label, sub }, i) => (
            <AnimateIn key={label} delay={i * 0.08} direction="up">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: "#EAF5F0" }}
                >
                  <Icon size={18} className="text-[#153D35]" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#153D35]">{label}</p>
                  <p className="text-xs mt-0.5 text-[#64748B]">{sub}</p>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
