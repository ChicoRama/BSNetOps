export default function Navbar() {
  return (
    <header className="relative z-20 flex items-center justify-between">
      <a href="/" className="flex items-center" aria-label="BSN">
        <img
          src="/images/logo-BSN.png"
          alt="Logo BSN"
          className="h-16 w-auto object-contain"
        />
      </a>

      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="group relative rounded-lg border border-[#00634b] bg-white/90 px-5 py-3 text-sm font-semibold text-[#00634b] shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-[#f1faf7] hover:shadow-xl active:translate-y-0 active:scale-95"
        >
          <span className="absolute -inset-1.5 -z-10 rounded-xl bg-[#00634b]/0 blur-sm transition-all duration-300 group-hover:bg-[#00634b]/20" />
          Sign In
        </a>

        <a
          href="/register"
          className="group relative rounded-lg bg-[#00634b] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#004d3a] hover:shadow-xl active:translate-y-0 active:scale-95"
        >
          <span className="absolute -inset-1.5 -z-10 rounded-xl bg-[#00634b]/0 blur-sm transition-all duration-300 group-hover:bg-[#00634b]/20" />
          Sign Up
        </a>
      </div>
    </header>
  );
}