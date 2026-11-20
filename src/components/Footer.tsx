export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-10 border-t border-[#D1E8DF] bg-[#F6F8F7]">
      <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <p className="font-bold text-base text-[#153D35]">RekaDana</p>
          <p className="text-sm mt-1 text-[#64748B]">
            Aplikasi pengelolaan anggaran kegiatan sekolah.
          </p>
        </div>

        <nav aria-label="Tautan cepat">
          <ul className="flex flex-col sm:items-end gap-1 text-sm text-[#64748B]">
            {[
              { label: "Fitur", href: "#fitur" },
              { label: "Cara Pakai", href: "#cara-pakai" },
              { label: "Akun Demo", href: "#demo" },
              { label: "Unduh APK", href: "#unduh" },
            ].map(({ label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  className="hover:text-[#153D35] hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#153D35] rounded"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-5 mt-8 pt-6 border-t border-[#D1E8DF] text-xs text-[#94A3B8]">
        <p>&copy; {year} RekaDana. Dikembangkan untuk lomba Traspac.</p>
      </div>
    </footer>
  );
}
