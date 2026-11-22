import {
  Calculator,
  FileText,
  Receipt,
  CheckCircle,
  BarChart2,
  Users,
} from "lucide-react";
import AnimateIn from "@/components/AnimateIn";
import { StaggerGroup, StaggerItem } from "@/components/AnimateIn";
import { FeaturesFinancialFloats } from "@/components/FinancialFloats";

const FEATURES = [
  {
    icon: Calculator,
    title: "Perencanaan Anggaran",
    desc: "Susun rincian anggaran kegiatan sebelum kegiatan dimulai. Panitia dapat membuat versi dan skenario anggaran untuk perbandingan.",
    accent: true, // fitur utama
    micro: (
      <div className="mt-4 pt-3 border-t border-[#D1E8DF]/60">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-[#64748B] font-medium">Realisasi Pos Kas</span>
          <span className="text-[#153D35] font-bold tabular-nums">71%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#EAF5F0] overflow-hidden">
          <div className="h-full rounded-full bg-[#35B88A]" style={{ width: "71%" }} />
        </div>
      </div>
    ),
  },
  {
    icon: Receipt,
    title: "Pengajuan Pengeluaran",
    desc: "Anggota panitia mengajukan pengeluaran disertai bukti foto. Setiap pengajuan tercatat dengan status yang jelas.",
    accent: false,
    micro: (
      <div className="mt-4 pt-3 border-t border-[#D1E8DF]/60 flex items-center justify-between text-xs">
        <span className="text-[#64748B]">Lampiran Nota</span>
        <span className="font-semibold text-[#153D35] px-2 py-0.5 rounded-[4px] bg-[#EAF5F0]">
          Foto Fisik + Nominal
        </span>
      </div>
    ),
  },
  {
    icon: CheckCircle,
    title: "Persetujuan Bertingkat",
    desc: "Bendahara atau guru pendamping meninjau dan menyetujui setiap pengeluaran. Tidak ada pengeluaran yang lolos tanpa persetujuan.",
    accent: false,
    micro: (
      <div className="mt-4 pt-3 border-t border-[#D1E8DF]/60 flex items-center gap-2 text-xs">
        <span className="text-[#35B88A] font-bold">✓ Ketua</span>
        <span className="text-[#64748B]">→</span>
        <span className="text-[#35B88A] font-bold">✓ Bendahara</span>
      </div>
    ),
  },
  {
    icon: FileText,
    title: "Bukti Pembayaran",
    desc: "Setiap transaksi wajib dilampirkan bukti. Dokumen tersimpan rapi dan bisa diakses kapan saja untuk audit.",
    accent: false,
    micro: (
      <div className="mt-4 pt-3 border-t border-[#D1E8DF]/60 flex items-center justify-between text-xs">
        <span className="text-[#64748B]">Arsip Bukti</span>
        <span className="font-semibold text-[#065F46] px-2 py-0.5 rounded-[4px] bg-[#D1FAE5]">
          Tersimpan Terpusat
        </span>
      </div>
    ),
  },
  {
    icon: BarChart2,
    title: "Laporan Otomatis",
    desc: "Laporan keuangan kegiatan terbentuk otomatis dari data yang sudah diinput. Siap dicetak atau dibagikan.",
    accent: false,
    micro: (
      <div className="mt-4 pt-3 border-t border-[#D1E8DF]/60 flex items-end gap-1.5 h-6">
        <div className="w-1/4 bg-[#D1E8DF] rounded-t-[2px] h-3" />
        <div className="w-1/4 bg-[#35B88A]/50 rounded-t-[2px] h-4" />
        <div className="w-1/4 bg-[#2EA87D] rounded-t-[2px] h-5" />
        <div className="w-1/4 bg-[#153D35] rounded-t-[2px] h-6" />
        <span className="text-[10px] text-[#64748B] ml-2 self-center font-medium">Buku Kas Rapi</span>
      </div>
    ),
  },
  {
    icon: Users,
    title: "Manajemen Panitia",
    desc: "Tambahkan anggota panitia dengan peran masing-masing: ketua, bendahara, atau anggota. Satu organisasi, banyak kegiatan.",
    accent: false,
    micro: (
      <div className="mt-4 pt-3 border-t border-[#D1E8DF]/60 flex items-center gap-1.5 text-[11px]">
        <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium">Ketua</span>
        <span className="px-1.5 py-0.5 rounded bg-[#EAF5F0] text-[#153D35] font-semibold">Bendahara</span>
        <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium">Anggota</span>
      </div>
    ),
  },
];

export default function Features() {
  return (
    <section
      id="fitur"
      className="py-20 bg-[#F6F8F7] relative overflow-hidden"
      aria-labelledby="fitur-heading"
    >
      {/* Dekorasi ambient — alasan: memberi karakter section tanpa mendominasi grid fitur */}
      <FeaturesFinancialFloats />
      <div className="relative max-w-5xl mx-auto px-5 z-10">
        <AnimateIn className="mb-14">
          <h2
            id="fitur-heading"
            className="text-2xl font-bold mb-3 text-[#153D35]"
          >
            Semua yang dibutuhkan panitia
          </h2>
          <p className="text-base max-w-lg text-[#475569]">
            Dari perencanaan hingga pertanggungjawaban, RekaDana menyediakan
            alur kerja keuangan yang terstruktur.
          </p>
        </AnimateIn>

        {/* Stagger grid — alasan: diferensiasi visual antar card yang identik (R-14 fix) */}
        <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, accent, micro }) => (
            <StaggerItem key={title}>
              <article
                className="group bg-white rounded-[10px] p-6 border border-[#D1E8DF] hover:border-[#35B88A] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between h-full"
                style={{
                  boxShadow:
                    "0 1px 3px rgba(21,61,53,0.08), 0 1px 2px rgba(21,61,53,0.04)",
                }}
              >
                <div>
                  {/* Icon container */}
                  <div
                    className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-4 transition-colors duration-200"
                    style={{
                      backgroundColor: accent ? "#153D35" : "#EAF5F0",
                    }}
                  >
                    <Icon
                      size={20}
                      style={{ color: accent ? "#35B88A" : "#153D35" }}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-[#153D35]">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#475569]">{desc}</p>
                </div>
                {/* Financial micro-widget */}
                {micro}
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
