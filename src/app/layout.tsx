import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import "@/app/globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RekaDana",
  description: "Aplikasi pengelolaan anggaran kegiatan untuk panitia OSIS, ekstrakurikuler, dan kegiatan sekolah.",
  openGraph: {
    title: "RekaDana",
    description: "Kelola anggaran kegiatan, dari rencana sampai laporan.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
