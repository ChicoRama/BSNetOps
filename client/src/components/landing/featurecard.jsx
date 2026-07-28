export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="group relative mb-3">
        <span className="absolute -inset-1.5 rounded-2xl bg-[#00634b]/0 blur-sm transition-all duration-300 group-hover:bg-[#00634b]/18" />

        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-white/85 text-2xl text-[#00634b] shadow-md backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 group-hover:bg-white group-hover:shadow-xl">
          {icon}
        </div>
      </div>

      <h3 className="text-[12px] font-semibold leading-4 text-slate-800">
        {title}
      </h3>

      <p className="text-[12px] leading-4 text-slate-700">{description}</p>
    </div>
  );
}