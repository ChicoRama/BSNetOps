import { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState({
    password: "",
    confirmPassword: "",
    general: "",
  });

  // 🔥 Supabase otomatis membaca access_token dari URL (hash) saat halaman dimuat.
  // Kita tunggu event PASSWORD_RECOVERY / SIGNED_IN sebelum menampilkan form.
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionReady(true);
      }
    });

    // Fallback: cek session yang sudah ada (kalau event sempat kelewat sebelum listener terpasang)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        // Beri jeda sedikit sebelum menganggap token tidak valid,
        // karena Supabase butuh waktu memproses hash URL saat load pertama.
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: retryData }) => {
            if (!retryData.session) setTokenInvalid(true);
          });
        }, 2000);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError({ ...error, [name]: "", general: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    let newError = { password: "", confirmPassword: "", general: "" };

    if (!form.password) newError.password = "Password baru wajib diisi";
    else if (form.password.length < 6) newError.password = "Password minimal 6 karakter";

    if (!form.confirmPassword) newError.confirmPassword = "Konfirmasi password wajib diisi";
    else if (form.password !== form.confirmPassword) newError.confirmPassword = "Password tidak sama";

    setError(newError);
    if (newError.password || newError.confirmPassword) return;

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (updateError) throw updateError;

      toast.success("Password berhasil diubah! Silakan login dengan password baru Anda.");
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Gagal mengubah password:", err.message);
      setError({ ...newError, general: "Gagal mengubah password: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('./images/landingpage-bg.jpeg')" }}
      />
      <div className="absolute inset-0 bg-black/35" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="relative w-full max-w-[400px] rounded-2xl bg-white px-8 py-8 shadow-2xl">

          {/* TITLE */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#00634b]">
              Buat Password Baru
            </h1>
            <p className="text-sm text-[#4a9b7c]">
              Masukkan password baru untuk akun Anda
            </p>
          </div>

          {tokenInvalid ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600">
                Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru.
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-1 hover:bg-[#004d3a]"
              >
                Kembali ke Login
              </button>
            </div>
          ) : !sessionReady ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Memverifikasi tautan reset password...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {error.general && (
                <div className="rounded-lg bg-red-100 p-2 text-center text-sm text-red-600">
                  {error.general}
                </div>
              )}

              {/* PASSWORD BARU */}
              <div className="relative">
                <label className="mb-1 block text-sm font-semibold">
                  Password Baru
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 cursor-pointer text-slate-600 hover:text-[#00634b] active:scale-90"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {error.password && (
                  <p className="mt-1 text-xs text-red-500">{error.password}</p>
                )}
              </div>

              {/* KONFIRMASI PASSWORD */}
              <div className="relative">
                <label className="mb-1 block text-sm font-semibold">
                  Konfirmasi Password Baru
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ulangi password baru"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 cursor-pointer text-slate-600 hover:text-[#00634b] active:scale-90"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {error.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{error.confirmPassword}</p>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-1 hover:bg-[#004d3a] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
              </button>

            </form>
          )}

        </div>
      </section>
    </main>
  );
}