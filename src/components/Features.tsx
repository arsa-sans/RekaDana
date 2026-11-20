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

const FEATURES = [
  {
    icon: Calculator,
    title: "Perencanaan Anggaran",
    desc: "Susun rincian anggaran kegiatan sebelum kegiatan dimulai. Panitia dapat membuat versi dan skenario anggaran untuk perbandingan.",
    accent: true, // fitur utama — mendapat highlight berbeda
  },
  {
    icon: Receipt,
    title: "Pengajuan Pengeluaran",
    desc: "Anggota panitia mengajukan pengeluaran disertai bukti foto. Setiap pengajuan tercatat dengan status yang jelas.",
    accent: false,
  },
  {
    icon: CheckCircle,
    title: "Persetujuan Bertingkat",
    desc: "Bendahara atau guru pendamping meninjau dan menyetujui setiap pengeluaran. Tidak ada pengeluaran yang lolos tanpa persetujuan.",
    accent: false,
  },
  {
    icon: FileText,
    title: "Bukti Pembayaran",
    desc: "Setiap transaksi wajib dilampirkan bukti. Dokumen tersimpan rapi dan bisa diakses kapan saja untuk audit.",
    accent: false,
  },
  {
    icon: BarChart2,
    title: "Laporan Otomatis",
    desc: "Laporan keuangan kegiatan terbentuk otomatis dari data yang sudah diinput. Siap dicetak atau dibagikan.",
    accent: false,
  },
  {
    icon: Users,
    title: "Manajemen Panitia",
    desc: "Tambahkan anggota panitia dengan peran masing-masing: ketua, bendahara, atau anggota. Satu organisasi, banyak kegiatan.",
    accent: false,
  },
];

export default function Features() {
  return (
    <section
      id="fitur"
      className="py-20 bg-[#F6F8F7]"
      aria-labelledby="fitur-heading"
    >
      <div className="max-w-5xl mx-auto px-5">
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
          {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
            <StaggerItem key={title}>
              <article
                className="group bg-white rounded-[10px] p-6 border border-[#D1E8DF] hover:border-[#35B88A] hover:-translate-y-1 transition-all duration-200"
                style={{
                  boxShadow:
                    "0 1px 3px rgba(21,61,53,0.08), 0 1px 2px rgba(21,61,53,0.04)",
                }}
              >
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
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
