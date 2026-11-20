import { Download, Smartphone } from "lucide-react";

export default function DownloadSection() {
  return (
    <section
      id="unduh"
      className="py-20 bg-[#153D35]"
      aria-labelledby="unduh-heading"
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="max-w-xl">
          <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mb-6 bg-[#35B88A]/20">
            <Smartphone size={20} className="text-[#35B88A]" aria-hidden="true" />
          </div>

          <h2
            id="unduh-heading"
            className="text-2xl font-bold mb-4 text-white"
          >
            Unduh RekaDana untuk Android
          </h2>

          <p className="text-base leading-relaxed mb-8 text-white/75">
            RekaDana tersedia sebagai aplikasi Android. Unduh file APK di bawah
            dan pasang langsung di perangkat Android siswa atau guru pendamping.
          </p>

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

          {/* Catatan instalasi */}
          <div className="mt-8 p-4 rounded-[10px] bg-white/[0.06] border border-white/10">
            <p className="text-sm font-medium text-white mb-2">Cara memasang APK</p>
            <ol className="list-decimal list-inside flex flex-col gap-1.5">
              {[
                "Unduh file APK ke perangkat Android.",
                "Buka Pengaturan lalu izinkan instalasi dari sumber tidak dikenal.",
                "Buka file APK yang diunduh dan ikuti proses instalasi.",
                "Masuk dengan akun yang diberikan oleh ketua organisasi.",
              ].map((step) => (
                <li key={step} className="text-sm text-white/70">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
