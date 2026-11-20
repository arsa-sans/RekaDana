import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import DemoAccounts from "@/components/DemoAccounts";
import DownloadSection from "@/components/DownloadSection";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <DemoAccounts />
        <DownloadSection />
      </main>
      <Footer />
    </div>
  );
}
