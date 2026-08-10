import { useEffect, useState } from "react";
import { FaXmark, FaEye, FaEyeSlash } from "react-icons/fa6";
import { useNavigate, Link } from "react-router-dom"; 
import { supabase } from "../../supabaseClient"; 
import toast from "react-hot-toast"; 

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State form dikembalikan menggunakan username (untuk menyimpan input email)
  const [form, setForm] = useState({
    username: "", 
    password: "",
    remember: false,
  });

  const [forgotEmail, setForgotEmail] = useState("");

  const [error, setError] = useState({
    username: "", 
    password: "",
    general: "", 
  });

  // Cek apakah ada email yang tersimpan sebelumnya
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if(savedEmail){
      setForm(prev => ({ ...prev, username: savedEmail, remember: true }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
    setError({
      ...error,
      [name]: "",
      general: "", 
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return; 

    let newError = { username: "", password: "", general: "" };

    if (!form.username) newError.username = "Masukkan email";
    if (!form.password) newError.password = "Masukkan password";

    setError(newError);
    if (newError.username || newError.password) return;

    setIsLoading(true); 
    const inputEmail = form.username.trim().toLowerCase();

    try {
      // 1. CEK DATA ROLE DAN STATUS PENANGGUHAN DI DATABASE
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('email, role, is_suspended, nama_lengkap, staff_id, unit, jabatan, no_telepon')
        .eq('email', inputEmail)
        .maybeSingle(); 

      // Cek apakah akun ditangguhkan
      if (roleData && roleData.is_suspended === true) {
        toast.error(
          (t) => (
            <div>
              <b className="text-red-700 font-bold text-sm">Akun Ditangguhkan!</b>
              <p className="text-xs mt-1 text-slate-600">Anda tidak memiliki akses ke dalam sistem. Silakan hubungi Admin Gudang.</p>
            </div>
          ), 
          { duration: 5000, icon: '⛔' }
        );
        setIsLoading(false);
        return; 
      }

      // 2. LOGIN LANGSUNG KE SUPABASE MENGGUNAKAN EMAIL
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: inputEmail, 
        password: form.password,
      });

      if (supabaseError) {
        setError({ ...newError, general: "Email atau password yang Anda masukkan salah." });
        setIsLoading(false);
        return;
      }

      let userRole = "user"; 
      if (roleData && roleData.role) {
        userRole = roleData.role.toLowerCase(); 
      }

      // 3. SIMPAN SESI DAN DATA PROFIL
      if (data.session) {
        localStorage.setItem("token", data.session.access_token);
        localStorage.setItem("access_token", data.session.access_token);

        if (form.remember) {
          localStorage.setItem("rememberedEmail", inputEmail);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        const profileInfo = {
          email: inputEmail,
          namaLengkap: roleData?.nama_lengkap || inputEmail.split('@')[0],
          nipPegawai: roleData?.staff_id || "",
          divisi: roleData?.unit || "",
          role: userRole,     
          jabatan: roleData?.jabatan || userRole,  
          noTelepon: roleData?.no_telepon || ""
        };
        localStorage.setItem("userProfile", JSON.stringify(profileInfo));
      }

      // 4. ARAHKAN KE DASHBOARD SESUAI ROLE
      if (userRole === "admin" || userRole === "head unit") {
        navigate("/admin");
      } else if (userRole === "manager") {
        navigate("/manager");
      } else {
        navigate("/user");
      }

    } catch (err) {
      console.error("Terjadi kesalahan sistem saat login:", err);
      setError({ ...newError, general: "Terjadi kesalahan koneksi ke server." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast.error("Email wajib diisi");
      return;
    }

    const toastId = toast.loading("Mengirim link..."); 

    // Menggunakan origin web yang stabil untuk reset password
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `https://bsnetops.pages.dev/`,
    });

    if (error) {
      toast.error(`Gagal: ${error.message}`, { id: toastId });
    } else {
      toast.success(
        (t) => (
          <div>
            <b className="text-[#00634b] font-bold text-sm">Link Terkirim!</b>
            <p className="text-xs mt-1 text-slate-600">Silakan cek kotak masuk atau folder spam email Anda.</p>
          </div>
        ), 
        { id: toastId, duration: 5000, icon: '✉️' }
      );
      setShowForgot(false);
      setForgotEmail("");
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

      {/* LOGIN MODAL */}
      {!showForgot && (
        <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white px-8 py-8 shadow-2xl animate-in zoom-in-95 duration-300">

            {/* CLOSE */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="absolute right-5 top-5 cursor-pointer text-xl text-slate-400 transition hover:scale-110 hover:text-red-500"
            >
              <FaXmark />
            </button>

            {/* TITLE */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#00634b]">
                Selamat Datang!
              </h1>
              <p className="text-sm text-[#4a9b7c]">
                Masuk untuk mengakses akun anda
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {error.general && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center text-sm font-semibold text-red-600">
                  {error.general}
                </div>
              )}

              {/* EMAIL */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Email
                </label>
                <input
                  type="email" 
                  name="username" 
                  value={form.username}
                  onChange={handleChange}
                  placeholder="contoh@bsn.go.id"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/50 transition-all"
                />
                {error.username && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {error.username}
                  </p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="relative">
                <label className="mb-1 block text-sm font-semibold">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 cursor-pointer text-slate-400 hover:text-[#00634b] active:scale-90 transition-all"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {error.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {error.password}
                  </p>
                )}
              </div>

              {/* REMEMBER + FORGOT */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex cursor-pointer items-center gap-2 font-medium select-none text-slate-600 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                    className="cursor-pointer accent-[#00634b] w-4 h-4 rounded"
                  />
                  Ingat Saya
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="cursor-pointer font-bold text-[#00634b] hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 hover:bg-[#004d3a] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? "Memproses Data..." : "Log in"}
              </button>

            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
            Belum punya akun?{" "}
            <Link
                to="/register"
                className="font-bold text-[#00634b] hover:underline cursor-pointer"
            >
                Daftar Sekarang
            </Link>
            </p>

          </div>
        </section>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Reset Password
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Kami akan mengirimkan link untuk memulihkan akunmu.</p>
              </div>
              <button
                onClick={() => setShowForgot(false)}
                className="cursor-pointer text-xl p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleForgot} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email Terdaftar</label>
                <input
                  type="email"
                  placeholder="contoh@bsn.go.id"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/50 focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg bg-[#00634b] py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 hover:bg-[#004d3a]"
              >
                Kirim Link Reset
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}