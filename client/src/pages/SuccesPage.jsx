// SuccessPage.jsx
import { useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";

export default function SuccessPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 text-center shadow-2xl">
        <FaCheckCircle className="mx-auto mb-4 text-6xl text-[#00634b]" />
        
        <h1 className="mb-2 text-2xl font-bold text-[#00634b]">
          Verifikasi Berhasil! 🎉
        </h1>
        <p className="mb-8 text-sm text-slate-600">
          Email kamu telah berhasil diverifikasi. Akun BSNetOps kamu sekarang sudah aktif dan siap digunakan.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="w-full rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-1 hover:bg-[#004d3a]"
        >
          Lanjut ke Halaman Login
        </button>
      </div>
    </main>
  );
}