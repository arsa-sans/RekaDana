"use client";

import { motion } from "framer-motion";
import { Download, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

// 3D phone dimuat secara lazy — tidak dirender di server
const Hero3DPhone = dynamic(() => import("@/components/Hero3DPhone"), { ssr: false });

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-[#153D35]"
      aria-labelledby="hero-heading"
    >
      {/* Tekstur diagonal — alasan: memberi karakter brand Forest tanpa gimmick */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #35B88A 0px, #35B88A 1px, transparent 1px, transparent 24px)",
        }}
      />

      {/* Radial ambient — alasan: kedalaman, bukan dekorasi flat */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 80% 50%, rgba(53,184,138,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-0 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: teks & CTA */}
        <div className="pb-24 lg:pb-28">
          {/* Context label — masuk dulu, ukuran kecil */}
          <motion.p
            className="text-sm font-medium mb-5 text-[#35B88A]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            Untuk OSIS, Ekstrakurikuler, dan Panitia Kegiatan Sekolah
          </motion.p>

          <motion.h1
            id="hero-heading"
            className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Kelola anggaran kegiatan,
            <br />
            dari rencana sampai laporan.
          </motion.h1>

          <motion.p
            className="text-base leading-relaxed mb-9 max-w-md text-white/75"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            RekaDana membantu panitia merencanakan anggaran, mengajukan
            pengeluaran, melampirkan bukti, dan menghasilkan laporan keuangan
            yang rapi, langsung dari Android.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <a
              href="#unduh"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-[6px] bg-[#35B88A] text-[#153D35] hover:bg-[#2EA87D] transition-colors"
            >
              <Download size={16} aria-hidden="true" />
              Unduh APK
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-[6px] border border-white/25 text-white/90 hover:border-white/50 hover:text-white transition-colors"
            >
              Lihat akun demo
              <ChevronRight size={16} aria-hidden="true" />
            </a>
          </motion.div>
        </div>

        {/* Right: 3D phone — alasan: menunjukkan bahwa ini aplikasi Android secara interaktif */}
        <motion.div
          className="hidden lg:flex justify-center items-end h-[520px] relative"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <Hero3DPhone />
        </motion.div>
      </div>

      {/* Transisi ke latar terang */}
      <div
        aria-hidden="true"
        className="h-10"
        style={{ background: "linear-gradient(to bottom, #153D35, #F6F8F7)" }}
      />
    </section>
  );
}
