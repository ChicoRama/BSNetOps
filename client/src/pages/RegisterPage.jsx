import { useState } from "react";
import { FaXmark } from "react-icons/fa6";
import { useNavigate, Link } from "react-router-dom"; 
import { supabase } from "../../supabaseClient";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const navigate = useNavigate(); 
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    staffId: "",
    unit: "",
  });

  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    setError({
      ...error,
      [name]: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newError = {};

    // VALIDASI FIELD WAJIB
    if (!form.username) newError.username = "Username wajib diisi";
    if (!form.email) newError.email = "Email wajib diisi";
    if (!form.password) newError.password = "Password wajib diisi";
    if (!form.confirmPassword)
      newError.confirmPassword = "Konfirmasi password wajib diisi";
    if (!form.unit) newError.unit = "Unit wajib diisi";

    // VALIDASI PASSWORD
    if (form.password && form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        newError.confirmPassword = "Password tidak sama";
      }
    }

    // VALIDASI DOMAIN EMAIL
    const allowedDomain = "@gmail.com";
    if (form.email && !form.email.toLowerCase().endsWith(allowedDomain)) {
      newError.email = `Wajib menggunakan email berakhiran ${allowedDomain}`;
    }

    setError(newError);
    if (Object.keys(newError).length > 0) return;

    setLoading(true);
    const toastId = toast.loading("Memeriksa data...");

    try {
      // 🔥 1. CEK DULU: APAKAH EMAIL SUDAH TERDAFTAR DI DATABASE?
      const { data: existingUser, error: checkError } = await supabase
        .from('user_roles')
        .select('email')
        .eq('email', form.email)
        .maybeSingle();

      if (existingUser) {
        toast.error(
          (t) => (
            <div>
              <b className="text-red-700 font-bold text-sm">Pendaftaran Gagal!</b>
              <p className="text-xs mt-1 text-slate-600">Email ini sudah terdaftar di sistem. Silakan gunakan email lain atau langsung Login.</p>
            </div>
          ), 
          { id: toastId, duration: 5000, icon: '⚠️' }
        );
        setLoading(false);
        return; // Hentikan proses pendaftaran
      }

      toast.loading("Mendaftarkan akun...", { id: toastId });

      // 2. DAFTARKAN KE SUPABASE AUTH & SISIPKAN METADATA
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            username: form.username,
            staff_id: form.staffId,
            unit: form.unit
          },
          emailRedirectTo: `${window.location.origin}/terverifikasi`
        }
      });

      if (authError) throw authError;

      // 🔥 3. DESAIN TOAST SUKSES YANG LEBIH CANTIK
      toast.success(
        (t) => (
          <div>
            <b className="text-[#00634b] font-bold text-sm">Registrasi Berhasil!</b>
            <p className="text-xs mt-1 text-slate-600">Silakan cek kotak masuk email Anda untuk verifikasi akun sebelum login.</p>
          </div>
        ), 
        { id: toastId, duration: 6000, icon: '🎉' }
      );
      
      navigate("/login"); 

    } catch (err) {
      console.error("Terjadi kesalahan:", err.message);
      let errorMessage = err.message;
      if (errorMessage.toLowerCase().includes('already registered')) {
        errorMessage = 'Email sudah terdaftar di sistem autentikasi.';
      }

      toast.error(
        (t) => (
          <div>
            <b className="text-red-700 font-bold text-sm">Pendaftaran Gagal!</b>
            <p className="text-xs mt-1 text-slate-600">{errorMessage}</p>
          </div>
        ), 
        { id: toastId, duration: 5000, icon: '❌' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url('./images/landingpage-bg.jpeg')" }}
      />
      <div className="absolute inset-0 bg-black/35" />

      {/* CARD */}
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6">

        <div className="relative w-full max-w-[520px] rounded-2xl bg-white px-8 py-8 shadow-2xl animate-in zoom-in-95 duration-300">

          {/* CLOSE */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="absolute right-5 top-5 text-xl text-slate-400 transition hover:scale-110 hover:text-red-500 cursor-pointer"
          >
            <FaXmark />
          </button>

          {/* TITLE */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-[#00634b]">
              Buat Akun Baru
            </h1>
            <p className="text-sm text-[#4a9b7c]">
              Lengkapi data untuk akses sistem BSN
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">

              {/* USERNAME */}
              <div>
                <label className="text-sm font-semibold">Username</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Masukkan nama"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40 transition-all"
                />
                {error.username && (
                  <p className="text-xs font-medium text-red-500 mt-1">{error.username}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-sm font-semibold">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40 transition-all"
                />
                {error.password && (
                  <p className="text-xs font-medium text-red-500 mt-1">{error.password}</p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-sm font-semibold">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contoh@gmail.com"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40 transition-all"
                />
                {error.email && (
                  <p className="text-xs font-medium text-red-500 mt-1">{error.email}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="text-sm font-semibold">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40 transition-all"
                />
                {error.confirmPassword && (
                  <p className="text-xs font-medium text-red-500 mt-1">
                    {error.confirmPassword}
                  </p>
                )}
              </div>

              {/* UNIT */}
              <div className="col-span-2">
                <label className="text-sm font-semibold">Unit</label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/50 transition-all"
                >
                  <option value="" disabled hidden>Pilih Unit</option>
                  <option value="KC Semarang">KC Semarang</option>
                  <option value="KCP Majapahit">KCP Majapahit</option>
                  <option value="KCP Ngaliyan">KCP Ngaliyan</option>
                  <option value="KCP Ungaran">KCP Ungaran</option>
                  <option value="KCP Kendal">KCP Kendal</option>
                  <option value="KCP Kudus">KCP Kudus</option>
                  <option value="KCP Magelang">KCP Magelang</option>
                </select>
                {error.unit && (
                  <p className="text-xs font-medium text-red-500 mt-1">{error.unit}</p>
                )}
              </div>

            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 hover:bg-[#004d3a] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Memproses Pendaftaran..." : "Daftar Akun"}
            </button>
          </form>

          {/* FOOTER */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link
              to="/login"
              className="font-bold text-[#00634b] hover:underline cursor-pointer"
            >
              Masuk Sekarang
            </Link>
          </p>

        </div>
      </section>
    </main>
  );
}