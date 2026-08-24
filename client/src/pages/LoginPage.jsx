import { useEffect, useState } from "react";
import { FaXmark, FaEye, FaEyeSlash, FaWhatsapp } from "react-icons/fa6";
import { useNavigate } from "react-router-dom"; 
import { supabase } from "../../supabaseClient"; 
import toast from "react-hot-toast"; 

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    username: "", 
    password: "",
    remember: false,
  });

  const [error, setError] = useState({
    username: "", 
    password: "",
    general: "", 
  });

  useEffect(() => {
    const savedName = localStorage.getItem("rememberedUsername");
    if(savedName){
      setForm(prev => ({ ...prev, username: savedName, remember: true }));
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

  const catatLogin = async (email, userId) => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const ip = data.ip;

      await supabase.from('login_logs').insert([{
        email: email,
        user_id: userId,
        ip_address: ip,
        user_agent: navigator.userAgent 
      }]);
    } catch (err) {
      console.error("Gagal mencatat log login (bukan error fatal):", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return; 

    let newError = { username: "", password: "", general: "" };

    if (!form.username) newError.username = "Masukkan nama karyawan / ID pegawai";
    if (!form.password) newError.password = "Masukkan password";

    setError(newError);
    if (newError.username || newError.password) return;

    setIsLoading(true); 

    // 🔥 Toast Loading bergaya normal (rounded standar 10px)
    const toastId = toast.loading(
      <span className="text-sm font-bold text-zinc-700">Sedang masuk...</span>, 
      {
        style: {
          borderRadius: '10px',
          background: '#fff',
          padding: '10px 24px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        },
      }
    );

    const rawUsername = form.username.trim();
    let loginEmail = rawUsername; 

    if (!rawUsername.includes('@')) {
      const { data: userLookup } = await supabase
        .from('user_roles')
        .select('email')
        .ilike('username', rawUsername) 
        .maybeSingle();

      if (userLookup && userLookup.email) {
        loginEmail = userLookup.email;
      } else {
        loginEmail = `${rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@bsn.local`;
      }
    }

    try {
      const { data: authData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: loginEmail, 
        password: form.password,
      });

      if (supabaseError) {
        toast.dismiss(toastId); 
        setError({ ...newError, general: "Nama Karyawan atau password yang Anda masukkan salah." });
        setIsLoading(false);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('email, role, is_suspended, nama_lengkap, staff_id, unit, jabatan, no_telepon, is_first_login')
        .eq('email', loginEmail) 
        .maybeSingle(); 

      if (roleData && roleData.is_suspended === true) {
        await supabase.auth.signOut();
        toast.dismiss(toastId); 
        toast.error(
          (t) => (
            <div>
              <b className="text-red-700 font-bold text-sm">Akun Ditangguhkan!</b>
              <p className="text-xs mt-1 text-slate-600">Anda tidak memiliki akses ke dalam sistem. Silakan hubungi Admin.</p>
            </div>
          ), 
          { duration: 5000, icon: '⛔' }
        );
        setIsLoading(false);
        return; 
      }

      let userRole = "user"; 
      if (roleData && roleData.role) {
        userRole = roleData.role.toLowerCase(); 
      }

      if (authData.session) {
        localStorage.setItem("token", authData.session.access_token);
        localStorage.setItem("access_token", authData.session.access_token);

        if (form.remember) {
          localStorage.setItem("rememberedUsername", rawUsername); 
        } else {
          localStorage.removeItem("rememberedUsername");
        }

        const profileInfo = {
          email: loginEmail,
          namaLengkap: roleData?.nama_lengkap || roleData?.username || rawUsername,
          nipPegawai: roleData?.staff_id || "",
          divisi: roleData?.unit || "",
          role: userRole,    
          jabatan: roleData?.jabatan || userRole,  
          noTelepon: roleData?.no_telepon || "",
          is_first_login: roleData?.is_first_login ?? false 
        };
        localStorage.setItem("userProfile", JSON.stringify(profileInfo));

        await catatLogin(loginEmail, authData.user?.id);
      }

      // 🔥 Animasi Sukses Login (Toast Normal rounded 10px)
      toast.success(
        <span className="text-sm font-bold text-zinc-700">Login berhasil!</span>,
        { 
          id: toastId, 
          duration: 2000,
          style: {
            borderRadius: '10px',
            background: '#fff',
            padding: '10px 24px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          },
          iconTheme: {
            primary: '#00634b',
            secondary: '#fff',
          },
        }
      );

      // Jeda dikit biar animasinya keliatan
      setTimeout(() => {
        if (roleData?.is_first_login === true) {
          toast.success("Akun baru terdeteksi. Silakan ubah password Anda.", { duration: 4000 });
          navigate("/reset-password", { state: { forceReset: true } });
        } else if (userRole === "admin" || userRole === "head unit") {
          navigate("/admin");
        } else if (userRole === "manager") {
          navigate("/manager");
        } else {
          navigate("/user");
        }
      }, 1500);

    } catch (err) {
      console.error("Terjadi kesalahan sistem saat login:", err);
      toast.dismiss(toastId);
      setError({ ...newError, general: "Terjadi kesalahan koneksi ke server." });
      setIsLoading(false);
    }
  };

  const handleForgotInfo = (e) => {
    e.preventDefault();
    toast(
      (t) => (
        <div>
          <b className="text-amber-700 font-bold text-sm">Hubungi Administrator</b>
          <p className="text-xs mt-1 text-slate-600">Sistem login saat ini menggunakan Nama Lengkap. Untuk mereset password, silakan lapor ke Admin / HRD BSN.</p>
        </div>
      ),
      { duration: 6000, icon: '📞' }
    );
    setShowForgot(false);
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
          <div className="relative w-full max-w-[420px] rounded-3xl bg-white px-8 py-8 shadow-2xl animate-in zoom-in-95 duration-300">

            {/* CLOSE */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="absolute right-5 top-5 cursor-pointer text-xl text-slate-400 transition hover:scale-110 hover:text-red-500"
            >
              <FaXmark />
            </button>

            {/* TITLE */}
            <div className="mb-6 mt-2 text-center">
              <h1 className="text-2xl font-bold text-[#00634b]">
                Selamat Datang!
              </h1>
              <p className="text-[13px] font-medium text-slate-500 mt-1">
                Masuk untuk mengakses aplikasi BSNetOps
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} className="space-y-4">

              {error.general && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center text-sm font-semibold text-red-600">
                  {error.general}
                </div>
              )}

              {/* NAMA / USERNAME */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                  Nama Karyawan / ID Pegawai
                </label>
                <input
                  type="text" 
                  name="username" 
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Diar Ramadhan"
                  className="w-full rounded-xl bg-[#f0f4f8] px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#00634b]/30 transition-all border border-transparent focus:border-[#00634b]/50"
                />
                {error.username && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {error.username}
                  </p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="relative">
                <label className="mb-1.5 block text-xs font-bold text-slate-800">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  className="w-full rounded-xl bg-[#e7f5ed] px-4 py-3 pr-10 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#00634b]/30 transition-all border border-transparent focus:border-[#00634b]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-9 cursor-pointer text-[#00634b] hover:text-[#004d3a] active:scale-90 transition-all"
                >
                  {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                </button>
                {error.password && (
                  <p className="mt-1 text-xs text-red-500 font-medium">
                    {error.password}
                  </p>
                )}
              </div>

              {/* REMEMBER + FORGOT */}
              <div className="flex items-center justify-between text-xs pt-1 pb-2">
                <label className="flex cursor-pointer items-center gap-2 font-semibold select-none text-slate-600 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={form.remember}
                    onChange={handleChange}
                    className="cursor-pointer accent-[#00634b] w-4 h-4 rounded border-slate-300"
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
                className="w-full mt-2 cursor-pointer rounded-xl bg-[#00634b] py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 hover:bg-[#004d3a] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                Masuk
              </button>

            </form>
          </div>
        </section>
      )}

      {/* FORGOT PASSWORD MODAL (UPDATE VIA WHATSAPP) */}
      {showForgot && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center relative">
            
            <button
              onClick={() => setShowForgot(false)}
              className="absolute top-4 right-4 cursor-pointer text-xl p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-red-500 transition-all"
            >
              <FaXmark />
            </button>

            <div className="mb-4 mt-2">
              <h2 className="text-xl font-bold text-[#0f172a]">
                Lupa Password?
              </h2>
              <p className="text-[13px] font-medium text-slate-500 mt-1">Informasi pemulihan akun BSN</p>
            </div>

            <hr className="border-slate-100 my-4 w-4/5 mx-auto" />

            <div className="bg-[#fffbeb] border border-[#fef08a] rounded-xl p-4 mb-6">
              <p className="text-[13px] font-medium text-[#92400e] leading-relaxed">
                Untuk mereset password akun Anda, silakan hubungi <b className="text-[#78350f]">Admin</b> secara langsung melalui WhatsApp.
              </p>
            </div>

            {/* 🔥 TOMBOL LINK WHATSAPP */}
            <a
              href="https://wa.me/6285157778659"
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-[#00634b] py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 hover:bg-[#004d3a]"
            >
              <FaWhatsapp className="text-xl" /> 
              <span>Hubungi Administrator</span>
            </a>

            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="mt-4 text-[13px] font-bold text-slate-400 hover:text-slate-800 hover:underline cursor-pointer transition-colors"
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      )}
    </main>
  );
}