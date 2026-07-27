import { useState } from "react";
import { FaXmark, FaEye, FaEyeSlash } from "react-icons/fa6";
import { useNavigate } from "react-router-dom"; 
import { supabase } from "../../supabaseClient"; 

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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

    let newError = { username: "", password: "", general: "" };

    if (!form.username) newError.username = "Masukkan email";
    if (!form.password) newError.password = "Masukkan password";

    setError(newError);
    if (newError.username || newError.password) return;

    const inputEmail = form.username.toLowerCase();

    // 🔥 1. CEK STATUS PENANGGUHAN AKUN DI TABEL user_roles SEBELUM LOGIN
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, is_suspended')
      .eq('email', inputEmail)
      .maybeSingle(); 

    // Jika akun terdeteksi ditangguhkan (is_suspended = true), hentikan proses login
    if (roleData && roleData.is_suspended === true) {
      alert("❌ AKUN DITANGGUHKAN!\n\nAnda tidak memiliki akses untuk masuk ke dalam sistem. Silakan hubungi Administrator Gudang untuk informasi lebih lanjut.");
      return; 
    }

    // 2. PROSES LOGIN KE SUPABASE AUTH (Hanya berjalan jika tidak disuspend)
    const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
      email: inputEmail, 
      password: form.password,
    });

    if (supabaseError) {
      setError({ ...newError, general: "Email atau password salah" });
      return;
    }

    // 3. SIMPAN TOKEN & PROFIL DASAR KE LOCALSTORAGE
    if (data.session) {
      localStorage.setItem("token", data.session.access_token);
      localStorage.setItem("access_token", data.session.access_token);

      const profileInfo = {
        email: inputEmail,
        namaLengkap: data.user?.user_metadata?.full_name || inputEmail.split('@')[0],
        nipPegawai: "",
        divisi: "",
        jabatan: "",
        noTelepon: ""
      };
      localStorage.setItem("userProfile", JSON.stringify(profileInfo));
    }

    // 4. REDIRECT BERDASARKAN ROLE
    let userRole = "user"; 
    if (roleData && roleData.role) {
      userRole = roleData.role.toLowerCase(); 
    }

    if (userRole === "admin") {
      navigate("/admin");
    } else if (userRole === "manager") {
      navigate("/manager");
    } else {
      navigate("/user");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();

    if (!forgotEmail) {
      alert("Email wajib diisi");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);

    if (error) {
      alert(`Gagal: ${error.message}`);
    } else {
      alert("Link reset password berhasil dikirim ke email kamu!");
      setShowForgot(false);
      setForgotEmail("");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-900">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('/images/landingpage-bg.jpeg')" }}
      />
      <div className="absolute inset-0 bg-black/35" />

      {/* LOGIN MODAL */}
      {!showForgot && (
        <section className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="relative w-full max-w-[400px] rounded-2xl bg-white px-8 py-8 shadow-2xl">

            {/* CLOSE */}
            <a
              href="/"
              className="absolute right-5 top-5 cursor-pointer text-xl text-slate-900 transition hover:scale-110 hover:text-[#00634b]"
            >
              <FaXmark />
            </a>

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
                <div className="rounded-lg bg-red-100 p-2 text-center text-sm text-red-600">
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
                  placeholder="contoh@email.com"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                {error.username && (
                  <p className="mt-1 text-xs text-red-500">
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
                  placeholder="Password"
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
                  <p className="mt-1 text-xs text-red-500">
                    {error.password}
                  </p>
                )}
              </div>

              {/* REMEMBER + FORGOT */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 font-medium select-none">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                    className="cursor-pointer accent-[#00634b]"
                  />
                  Ingat Saya
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="cursor-pointer text-[#00634b] hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-1 hover:bg-[#004d3a]"
              >
                Log in
              </button>

            </form>

            <p className="mt-5 text-center text-sm">
            Belum punya akun?{" "}
            <a
                href="/register"
                className="font-semibold text-[#00634b] hover:underline cursor-pointer"
            >
                Daftar Sekarang
            </a>
            </p>

          </div>
        </section>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#00634b]">
                Reset Password
              </h2>
              <button
                onClick={() => setShowForgot(false)}
                className="cursor-pointer text-xl"
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleForgot} className="space-y-3">
              <input
                type="email"
                placeholder="Masukkan email kamu"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
              />
              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg bg-[#00634b] py-2 text-sm font-bold text-white hover:bg-[#004d3a]"
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