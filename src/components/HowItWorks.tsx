"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import AnimateIn from "@/components/AnimateIn";
import { HowItWorksFinancialFloats } from "@/components/FinancialFloats";

const STEPS = [
  {
    num: "1",
    title: "Daftarkan organisasi",
    desc: "Buat akun organisasi (OSIS, Rohis, Pramuka, dll.) dan undang anggota panitia.",
  },
  {
    num: "2",
    title: "Buat anggaran kegiatan",
    desc: "Rincikan pos pengeluaran yang direncanakan sebelum kegiatan berlangsung.",
  },
  {
    num: "3",
    title: "Ajukan dan setujui pengeluaran",
    desc: "Anggota panitia mengajukan pengeluaran disertai bukti. Bendahara meninjau dan menyetujui.",
  },
  {
    num: "4",
    title: "Ekspor laporan",
    desc: "Laporan keuangan siap dibagikan ke pembina atau kepala sekolah sebagai pertanggungjawaban.",
  },
];

function AnimatedLine() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div
      ref={ref}
      className="w-px flex-1 mt-1 mb-1 relative overflow-hidden"
      style={{ minHeight: "40px", backgroundColor: "rgba(209,232,223,0.3)" }}
      aria-hidden="true"
    >
      {/* Animasi garis tumbuh — alasan: reinforces sequential flow of steps */}
      <motion.div
        className="absolute top-0 left-0 w-full bg-[#D1E8DF]"
        initial={{ height: 0 }}
        animate={isInView ? { height: "100%" } : {}}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
      />
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="cara-pakai"
      className="py-20 bg-[#EAF5F0] relative overflow-hidden"
      aria-labelledby="cara-pakai-heading"
    >
      {/* Dekorasi ambient — alasan: section mint perlu element penanda finance domain */}
      <HowItWorksFinancialFloats />
      <div className="relative max-w-5xl mx-auto px-5 z-10">
        <AnimateIn className="mb-14">
          <h2
            id="cara-pakai-heading"
            className="text-2xl font-bold mb-3 text-[#153D35]"
          >
            Cara kerja RekaDana
          </h2>
          <p className="text-base text-[#475569]">
            Alur kerja yang mengikuti proses nyata pengelolaan kegiatan di sekolah.
          </p>
        </AnimateIn>

        {/* Dua kolom: langkah-langkah + visual ilustrasi sederhana */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Steps */}
          <div className="flex flex-col gap-0 max-w-lg">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-[#153D35] text-white"
                    initial={{ scale: 0.6, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.4, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {step.num}
                  </motion.div>
                  {i < STEPS.length - 1 && <AnimatedLine />}
                </div>

                <AnimateIn
                  delay={i * 0.12 + 0.05}
                  className={i < STEPS.length - 1 ? "pb-10" : ""}
                >
                  <h3 className="font-semibold text-base mb-1 mt-2 text-[#153D35]">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#475569]">{step.desc}</p>
                </AnimateIn>
              </div>
            ))}
          </div>

          {/* Visual panel — alasan: variasi komposisi section (R-05), tidak semua section card grid */}
          <AnimateIn direction="right" className="hidden lg:block">
            <div
              className="rounded-[16px] p-7 h-full flex flex-col justify-between"
              style={{
                backgroundColor: "white",
                border: "1px solid #D1E8DF",
                boxShadow: "0 1px 3px rgba(21,61,53,0.08), 0 1px 2px rgba(21,61,53,0.04)",
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-bold text-[#153D35] uppercase tracking-wide">
                    Alur Status Pengajuan Dana
                  </p>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#EAF5F0] text-[#153D35]">
                    Simulasi Sistem
                  </span>
                </div>

                {/* Status flow visualization */}
                {[
                  { label: "1. Draf Pengajuan", desc: "Input rincian pos anggaran", bg: "#F1F5F9", text: "#475569", w: "45%" },
                  { label: "2. Diajukan ke Bendahara", desc: "Lampiran nota & estimasi", bg: "#DBEAFE", text: "#1E40AF", w: "70%" },
                  { label: "3. Disetujui & Dicairkan", desc: "Tanda tangan digital tercatat", bg: "#D1FAE5", text: "#065F46", w: "90%" },
                  { label: "4. Laporan & Buku Kas", desc: "Realisasi otomatis masuk rekap", bg: "#EAF5F0", text: "#153D35", w: "100%" },
                ].map((s, i) => (
                  <div key={s.label} className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-[4px]"
                        style={{ backgroundColor: s.bg, color: s.text }}
                      >
                        {s.label}
                      </span>
                      <span className="text-[11px] text-[#64748B]">{s.desc}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EAF5F0] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#35B88A]"
                        initial={{ width: 0 }}
                        whileInView={{ width: s.w }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample transaction slip preview */}
              <div className="mt-6 p-4 rounded-[10px] bg-[#F6F8F7] border border-[#D1E8DF]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#35B88A]" />
                    <span className="text-xs font-bold text-[#153D35]">Contoh Bukti #RD-104</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded">
                    Terverifikasi
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <p className="text-xs text-[#64748B]">Sewa Sound System & Genset</p>
                  <p className="text-sm font-bold text-[#153D35] tabular-nums">Rp 1.250.000</p>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
