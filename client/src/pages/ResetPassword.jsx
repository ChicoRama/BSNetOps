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
  
  const [userData, setUserData] = useState(null);

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState({
    password: "",
    confirmPassword: "",
    general: "",
  });

  // 🔥 CEK SESI LOGIN: Pastikan user beneran punya akses ke halaman ini
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Kalau nggak ada sesi sama sekali, tendang ke login
        navigate("/login", { replace: true });
        return;
      }

      // Ambil data profil dari localStorage (Bawaan dari LoginPage)
      let profile = JSON.parse(localStorage.getItem("userProfile"));
      
      // Kalau profil kosong (misal dia datang dari link Lupa Password email), kita tarik manual dari DB
      if (!profile) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (roleData) {
          profile = {
            email: roleData.email,
            role: roleData.role || 'user',
            is_first_login: roleData.is_first_login
          };
          localStorage.setItem("userProfile", JSON.stringify(profile));
        }
      }
      
      setUserData(profile);
    };

    checkSession();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError({ ...error, [name]: "", general: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    let newError = { password: "", confirmPassword: "", general: "" };

    // VALIDASI
    if (!form.password) newError.password = "Password baru wajib diisi";
    else if (form.password.length < 6) newError.password = "Password minimal 6 karakter";
    else if (form.password === "12345678") newError.password = "Jangan gunakan password default!";

    if (!form.confirmPassword) newError.confirmPassword = "Konfirmasi password wajib diisi";
    else if (form.password !== form.confirmPassword) newError.confirmPassword = "Password tidak sama";

    setError(newError);
    if (newError.password || newError.confirmPassword) return;

    setIsLoading(true);
    const toastId = toast.loading("Menyimpan password baru...");

    try {
      // 1. UPDATE PASSWORD DI SUPABASE AUTH
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (updateError) throw updateError;

      // 2. MATIKAN STATUS FIRST LOGIN DI DATABASE
      if (user && user.email) {
        const { error: dbError } = await supabase
          .from('user_roles')
          .update({ is_first_login: false })
          .eq('email', user.email);
          
        if (dbError) console.error("Gagal update is_first_login:", dbError);
      }

      // 3. UPDATE LOCALSTORAGE BIAR NGGAK DITENDANG LAGI SAMA APP.JSX
      if (userData) {
        const updatedProfile = { ...userData, is_first_login: false };
        localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
      }

      toast.success("Password berhasil diubah! Mengalihkan ke Dashboard...", { id: toastId, duration: 3000 });

      // 4. LEMPAR LANGSUNG KE DASHBOARD SESUAI ROLE (Nggak usah suruh login ulang)
      setTimeout(() => {
        const role = (userData?.role || 'user').toLowerCase();
        if (role === "admin" || role === "head unit") navigate("/admin", { replace: true });
        else if (role === "manager") navigate("/manager", { replace: true });
        else navigate("/user", { replace: true });
      }, 1500);

    } catch (err) {
      console.error("Gagal mengubah password:", err.message);
      setError({ ...newError, general: "Gagal mengubah password: " + err.message });
      toast.error("Terjadi kesalahan!", { id: toastId });
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
        <div className="relative w-full max-w-[400px] rounded-2xl bg-white px-8 py-8 shadow-2xl animate-in zoom-in-95 duration-300">

          {/* TITLE */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#00634b]">
              Buat Password Baru
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Demi keamanan, silakan ganti password bawaan sistem dengan password Anda sendiri.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {error.general && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-center text-sm font-semibold text-red-600">
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
                className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 cursor-pointer text-slate-400 hover:text-[#00634b] active:scale-90 transition-all"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {error.password && (
                <p className="mt-1 text-xs font-medium text-red-500">{error.password}</p>
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
                className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 cursor-pointer text-slate-400 hover:text-[#00634b] active:scale-90 transition-all"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              {error.confirmPassword && (
                <p className="mt-1 text-xs font-medium text-red-500">{error.confirmPassword}</p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-1 hover:bg-[#004d3a] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Menyimpan..." : "Simpan & Lanjutkan"}
            </button>

          </form>

        </div>
      </section>
    </main>
  );
}