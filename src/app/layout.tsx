import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import "@/app/globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RekaDana",
  description: "Sistem pengelolaan anggaran kegiatan organisasi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
