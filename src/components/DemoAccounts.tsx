import { CopyButton } from "@/components/CopyButton";
import AnimateIn from "@/components/AnimateIn";
import { StaggerGroup, StaggerItem } from "@/components/AnimateIn";

const DEMO_ACCOUNTS = [
  {
    role: "Ketua Kegiatan",
    name: "Budi Santoso",
    email: "budi.santoso@demo.rekadana",
    password: "DemoRekaDana2026!",
    desc: "Membuat kegiatan, menyusun skenario anggaran, mengelola struktur panitia, dan memantau realisasi.",
  },
  {
    role: "Bendahara",
    name: "Siti Rahayu",
    email: "siti.rahayu@demo.rekadana",
    password: "DemoRekaDana2026!",
    desc: "Meninjau dan menyetujui pengajuan pengeluaran panitia, mencatat bukti transfer, dan mengelola kas.",
  },
  {
    role: "Anggota Panitia",
    name: "Andi Pratama",
    email: "andi.pratama@demo.rekadana",
    password: "DemoRekaDana2026!",
    desc: "Mengajukan pengeluaran kegiatan dengan lampiran bukti nota, serta memantau status pengajuan.",
  },
];

export default function DemoAccounts() {
  return (
    <section
      id="demo"
      className="py-20 bg-[#F6F8F7]"
      aria-labelledby="demo-heading"
    >
      <div className="max-w-5xl mx-auto px-5">
        <AnimateIn className="mb-12">
          <h2
            id="demo-heading"
            className="text-2xl font-bold mb-3 text-[#153D35]"
          >
            Coba dengan akun demo
          </h2>
          <p className="text-base text-[#475569]">
            Gunakan akun berikut untuk mencoba RekaDana langsung di perangkat Android.
            Unduh APK terlebih dahulu, lalu masuk dengan kredensial di bawah.
          </p>
        </AnimateIn>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {DEMO_ACCOUNTS.map((account) => (
            <StaggerItem key={account.role}>
              <article
                className="bg-white rounded-[10px] p-5 border border-[#D1E8DF] hover:border-[#35B88A] hover:-translate-y-0.5 transition-all duration-200"
                style={{
                  boxShadow: "0 1px 3px rgba(21,61,53,0.08), 0 1px 2px rgba(21,61,53,0.04)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-[#EAF5F0] text-[#153D35]">
                    {account.role}
                  </span>
                  <span className="text-xs font-medium text-[#64748B]">OSIS SMK</span>
                </div>

                <h3 className="text-base font-bold text-[#153D35] mb-2">{account.name}</h3>

                <p className="text-sm mb-5 leading-relaxed text-[#475569]">
                  {account.desc}
                </p>

                <div className="flex flex-col gap-2">
                  {[
                    { label: "Email", value: account.email },
                    { label: "Password", value: account.password },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] bg-[#F6F8F7] border border-[#D1E8DF]"
                    >
                      <div>
                        <p className="text-xs font-medium mb-0.5 text-[#64748B]">{label}</p>
                        <p className="text-sm font-medium text-[#153D35] tabular-nums">{value}</p>
                      </div>
                      <CopyButton value={value} label={label} />
                    </div>
                  ))}
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <AnimateIn delay={0.3}>
          <p className="mt-6 text-sm text-[#64748B]">
            Data demo diatur ulang setiap hari. Jangan gunakan data nyata pada akun demo.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
