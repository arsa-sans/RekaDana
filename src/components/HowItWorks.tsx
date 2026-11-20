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

export default function HowItWorks() {
  return (
    <section
      id="cara-pakai"
      className="py-20 bg-[#EAF5F0]"
      aria-labelledby="cara-pakai-heading"
    >
      <div className="max-w-5xl mx-auto px-5">
        <div className="mb-14">
          <h2
            id="cara-pakai-heading"
            className="text-2xl font-bold mb-3 text-[#153D35]"
          >
            Cara kerja RekaDana
          </h2>
          <p className="text-base text-[#475569]">
            Alur kerja yang mengikuti proses nyata pengelolaan kegiatan di sekolah.
          </p>
        </div>

        {/* Layout linear berurutan dengan garis penghubung */}
        {/* Alasan: 4 langkah dengan garis lebih jujur daripada card identik */}
        <div className="flex flex-col gap-0 max-w-lg">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-[#153D35] text-white">
                  {step.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-px flex-1 mt-1 mb-1 bg-[#D1E8DF]"
                    style={{ minHeight: "32px" }}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className={i < STEPS.length - 1 ? "pb-10" : ""}>
                <h3 className="font-semibold text-base mb-1 mt-2 text-[#153D35]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#475569]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
