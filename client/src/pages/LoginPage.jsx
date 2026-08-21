import { useEffect, useState } from "react";
import { FaXmark, FaEye, FaEyeSlash } from "react-icons/fa6";
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
    // 🔥 Sekarang yang diingat adalah Nama/Username, bukan email
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

    // 🔥 Pesan error disesuaikan
    if (!form.username) newError.username = "Masukkan nama lengkap / username";
    if (!form.password) newError.password = "Masukkan password";

    setError(newError);
    if (newError.username || newError.password) return;

    setIsLoading(true); 
    
    // 🔥 LOGIKA DETEKTIF: Cari email asli berdasarkan username
    const rawUsername = form.username.trim();
    let loginEmail = rawUsername; // Default kalau user iseng ngetik format email (ada @)

    if (!rawUsername.includes('@')) {
      // 1. Cari email aslinya di tabel user_roles
      const { data: userLookup } = await supabase
        .from('user_roles')
        .select('email')
        .ilike('username', rawUsername) // ilike = abaikan huruf besar/kecil
        .maybeSingle();

      if (userLookup && userLookup.email) {
        // Ketemu akun lama (ex: Ngetik "Test Bray" -> dapet "admin@gmail.com")
        loginEmail = userLookup.email;
      } else {
        // Akun baru hasil import Excel (ex: Ngetik "Joko Kendil" -> "jokokendil@bsn.local")
        loginEmail = `${rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@bsn.local`;
      }
    }

    try {
      // 1. LOGIN KE SUPABASE AUTH PAKAI EMAIL HASIL DETEKTIF
      const { data: authData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: loginEmail, 
        password: form.password,
      });

      if (supabaseError) {
        setError({ ...newError, general: "Nama Lengkap atau password yang Anda masukkan salah." });
        setIsLoading(false);
        return;
      }

      // 2. AMBIL DATA ROLE & STATUS FIRST LOGIN DI TABEL
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('email, role, is_suspended, nama_lengkap, staff_id, unit, jabatan, no_telepon, is_first_login')
        .eq('email', loginEmail) 
        .maybeSingle(); 

      // 3. CEK APAKAH AKUN DITANGGUHKAN
      if (roleData && roleData.is_suspended === true) {
        await supabase.auth.signOut();
        
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

      // 4. TENTUKAN ROLE
      let userRole = "user"; 
      if (roleData && roleData.role) {
        userRole = roleData.role.toLowerCase(); 
      }

      // 5. SIMPAN SESI DAN DATA PROFIL
      if (authData.session) {
        localStorage.setItem("token", authData.session.access_token);
        localStorage.setItem("access_token", authData.session.access_token);

        if (form.remember) {
          localStorage.setItem("rememberedUsername", rawUsername); // Simpan nama aslinya
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

      // 6. ARAHKAN KE DASHBOARD
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

    } catch (err) {
      console.error("Terjadi kesalahan sistem saat login:", err);
      setError({ ...newError, general: "Terjadi kesalahan koneksi ke server." });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 LUPA PASSWORD DIUBAH KARENA EMAIL DUMMY TIDAK BISA MENERIMA PESAN
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

              {/* NAMA / USERNAME (BUKAN EMAIL LAGI) */}
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Nama Lengkap / Username
                </label>
                <input
                  type="text" 
                  name="username" 
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Contoh: Joko Kendil"
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
          </div>
        </section>
      )}

      {/* FORGOT PASSWORD MODAL (KHUSUS INFO KARENA EMAIL DUMMY) */}
      {showForgot && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Lupa Password?
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">Informasi pemulihan akun BSN</p>
              </div>
              <button
                onClick={() => setShowForgot(false)}
                className="cursor-pointer text-xl p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleForgotInfo} className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-amber-800">
                  Untuk mereset password akun Anda, silakan hubungi <b className="text-amber-900">Administrator / HRD BSN</b> secara langsung.
                </p>
              </div>
              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg bg-[#00634b] py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 hover:bg-[#004d3a]"
              >
                Saya Mengerti
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}