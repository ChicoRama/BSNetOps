import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="relative z-20 flex items-center justify-between">
      {/* Ubah a href menjadi Link to */}
      <Link to="/" className="flex items-center" aria-label="BSN">
        <img
          src="./images/logo-BSN.png" /* Ditambahin titik biar aman di .exe */
          alt="Logo BSN"
          className="h-16 w-auto object-contain"
        />
      </Link>

      <div className="flex items-center gap-3">
        {/* Ubah a href menjadi Link to */}
        <Link
          to="/login"
          className="group relative rounded-lg border border-[#00634b] bg-white/90 px-5 py-3 text-sm font-semibold text-[#00634b] shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#f1faf7] hover:shadow-xl active:translate-y-0 active:scale-95"
        >
          <span className="absolute -inset-1.5 -z-10 rounded-xl bg-[#00634b]/0 blur-sm transition-all duration-300 group-hover:bg-[#00634b]/20" />
          Sign In
        </Link>

        {/* Ubah a href menjadi Link to */}
        <Link
          to="/register"
          className="group relative rounded-lg bg-[#00634b] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#004d3a] hover:shadow-xl active:translate-y-0 active:scale-95"
        >
          <span className="absolute -inset-1.5 -z-10 rounded-xl bg-[#00634b]/0 blur-sm transition-all duration-300 group-hover:bg-[#00634b]/20" />
          Sign Up
        </Link>
      </div>
    </header>
  );
}