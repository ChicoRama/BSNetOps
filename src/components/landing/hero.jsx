import {
  FaArrowRight,
  FaBoxArchive,
  FaChartColumn,
  FaShieldHalved,
} from "react-icons/fa6";
import FeatureCard from "./featurecard";

const features = [
  {
    icon: <FaBoxArchive />,
    title: "Manajemen Stok",
    description: "Terintegrasi",
  },
  {
    icon: <FaChartColumn />,
    title: "Monitoring",
    description: "Real-time",
  },
  {
    icon: <FaShieldHalved />,
    title: "Keamanan",
    description: "Terjamin",
  },
];

export default function Hero() {
  return (
    <section className="relative z-20 flex flex-1 items-center">
    <div className="w-full max-w-[480px] mt-8">
        <h1 className="text-[45px] font-extrabold leading-none tracking-tight text-[#00533d]">
          BSNetOps
        </h1>

        <h2 className="mt-3 text-[25px] font-semibold leading-tight tracking-tight text-slate-800">
          Sistem Manajemen Stok
        </h2>

        <div className="mt-5 h-0.5 w-24 rounded-full bg-[#16a987]" />

        <p className="mt-6 max-w-[450px] text-[15px] leading-7 text-slate-700">
          Solusi digital untuk pengelolaan inventaris yang lebih efisien,
          akurat, dan terintegrasi di lingkungan Bank Syariah Nasional.
        </p>

        <div className="group relative mt-7 inline-block">
          <span className="absolute -inset-1.5 rounded-2xl bg-[#00634b]/0 blur-sm transition-all duration-300 group-hover:bg-[#00634b]/20" />

          <a
            href="/login"
            className="relative z-10 inline-flex items-center gap-3 rounded-xl bg-[#00634b] px-7 py-4 text-[15px] font-semibold text-white shadow-lg shadow-emerald-950/20 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-[#004d3a] group-hover:shadow-xl active:translate-y-0 active:scale-95"
          >
            <FaArrowRight className="text-lg" />
            Get Started
          </a>
        </div>

        <div className="mt-8 grid max-w-[330px] grid-cols-3 gap-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}