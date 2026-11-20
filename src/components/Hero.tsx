import { Download, ChevronRight } from "lucide-react";

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-[#153D35]"
      aria-labelledby="hero-heading"
    >
      {/* Tekstur diagonal tipis dari brand identity Forest */}
      {/* Alasan: memberi karakter tanpa dekorasi random */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #35B88A 0px, #35B88A 1px, transparent 1px, transparent 24px)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5 pt-20 pb-24">
        <div className="max-w-2xl">
          {/* Target konteks */}
          <p className="text-sm font-medium mb-5 text-[#35B88A]">
            Untuk OSIS, Ekstrakurikuler, dan Panitia Kegiatan Sekolah
          </p>

          <h1
            id="hero-heading"
            className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5"
          >
            Kelola anggaran kegiatan,
            <br />
            dari rencana sampai laporan.
          </h1>

          <p className="text-base leading-relaxed mb-9 max-w-xl text-white/75">
            RekaDana membantu panitia merencanakan anggaran, mengajukan
            pengeluaran, melampirkan bukti, dan menghasilkan laporan keuangan
            yang rapi, langsung dari Android.
          </p>

          <div className="flex flex-wrap gap-3">
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
          </div>
        </div>

        {/* Phone mockup placeholder */}
        {/* Alasan: menunjukkan bahwa ini aplikasi Android */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute right-8 bottom-0 top-12"
        >
          <div className="relative w-56 h-full">
            <div className="w-48 h-80 rounded-[28px] border-4 mx-auto mt-4 border-white/15 bg-white/5">
              <div className="w-16 h-4 rounded-b-xl mx-auto bg-white/10" />
              <div className="p-4 flex flex-col gap-3 mt-2">
                <div className="h-6 rounded-[6px] bg-[#35B88A]/30" />
                <div className="h-3 rounded w-3/4 bg-white/10" />
                <div className="h-3 rounded w-1/2 bg-white/[0.08]" />
                <div className="h-14 rounded-[10px] mt-2 bg-white/[0.08]" />
                <div className="h-14 rounded-[10px] bg-white/[0.06]" />
                <div className="h-8 rounded-[6px] bg-[#35B88A]/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transisi ke latar terang */}
      <div
        aria-hidden="true"
        className="h-8"
        style={{ background: "linear-gradient(to bottom, #153D35, #F6F8F7)" }}
      />
    </section>
  );
}
