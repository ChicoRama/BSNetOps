import Navbar from "../components/landing/navbar";
import Hero from "../components/landing/hero";
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <main className="relative h-screen overflow-hidden bg-[#f6faf8] text-slate-900">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('./images/landingpage-bg.jpeg')" }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 16%, rgba(255,255,255,0.72) 29%, rgba(255,255,255,0.25) 42%, rgba(255,255,255,0.04) 53%, rgba(255,255,255,0) 64%)",
        }}
      />

      <div className="relative z-10 flex h-screen flex-col px-12 pt-8 pb-[65px]">
        <Navbar />
        <Hero />
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50">
        <div className="flex h-[54px] items-center justify-between rounded-t-2xl rounded-b-none bg-[#00533d] px-10 text-[11px] text-white/85 shadow-xl">
          <p>© 2026 Bank Syariah Nasional. All rights reserved.</p>

          <div className="flex items-center gap-5">
            {/* 🔥 Tag <a> diubah menjadi <Link> dan diarahkan ke path yang sudah didaftarkan */}
            <Link 
              to="/kebijakan-privasi"
              className="transition hover:text-white">
                Kebijakan Privasi
            </Link>

            <span className="text-white/45">|</span>

            <Link 
              to="/syarat-ketentuan"
              className="transition hover:text-white"
            >
                Syarat & Ketentuan
            </Link>

            <span className="text-white/45">|</span>

            <Link 
              to="/bantuan" 
              className="transition hover:text-white"
            >
                Bantuan
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}