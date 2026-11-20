import { Download, Smartphone } from "lucide-react";
import AnimateIn from "@/components/AnimateIn";

export default function DownloadSection() {
  return (
    <section
      id="unduh"
      className="py-20 bg-[#153D35] relative overflow-hidden"
      aria-labelledby="unduh-heading"
    >
      {/* Tekstur diagonal — konsisten dengan Hero */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #35B88A 0px, #35B88A 1px, transparent 1px, transparent 24px)",
        }}
      />
      {/* Radial light — alasan: focal point visual untuk CTA section */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-15"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 20% 50%, rgba(53,184,138,0.2) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <AnimateIn>
              <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-6 bg-[#35B88A]/20">
                <Smartphone size={20} className="text-[#35B88A]" aria-hidden="true" />
              </div>
            </AnimateIn>

            <AnimateIn delay={0.08}>
              <h2
                id="unduh-heading"
                className="text-2xl font-bold mb-4 text-white"
              >
                Unduh RekaDana untuk Android
              </h2>
            </AnimateIn>

            <AnimateIn delay={0.15}>
              <p className="text-base leading-relaxed mb-8 text-white/75">
                RekaDana tersedia sebagai aplikasi Android. Unduh file APK di bawah
                dan pasang langsung di perangkat Android siswa atau guru pendamping.
              </p>
            </AnimateIn>

            <AnimateIn delay={0.22}>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <a
                  href="/rekadana.apk"
                  download
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-[6px] font-semibold text-sm bg-[#35B88A] text-[#153D35] hover:bg-[#2EA87D] transition-colors"
                >
                  <Download size={18} aria-hidden="true" />
                  Unduh APK
                </a>
                <div>
                  <p className="text-sm font-medium text-white">Versi 1.0.0</p>
                  <p className="text-xs text-white/50">Android 7.0 (API 24) ke atas</p>
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Instalasi card — alasan: variasi layout kolom kanan (R-05) */}
          <AnimateIn direction="right" delay={0.1}>
            <div className="rounded-[10px] p-5 bg-white/[0.06] border border-white/10">
              <p className="text-sm font-medium text-white mb-4">Cara memasang APK</p>
              <ol className="flex flex-col gap-3">
                {[
                  "Unduh file APK ke perangkat Android.",
                  "Buka Pengaturan lalu izinkan instalasi dari sumber tidak dikenal.",
                  "Buka file APK yang diunduh dan ikuti proses instalasi.",
                  "Masuk dengan akun yang diberikan oleh ketua organisasi.",
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-white/70">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ backgroundColor: "rgba(53,184,138,0.2)", color: "#35B88A" }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
