import { useState } from "react";
import { FaXmark } from "react-icons/fa6";
import { useNavigate, Link } from "react-router-dom"; 
import { supabase } from "../../supabaseClient";

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
  const [loading, setLoading] = useState(false); // 🔥 Tambahan state loading

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
    if (!form.staffId) newError.staffId = "ID Staff wajib diisi";
    if (!form.unit) newError.unit = "Unit wajib diisi";

    // VALIDASI PASSWORD
    if (form.password && form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        newError.confirmPassword = "Password tidak sama";
      }
    }

    // VALIDASI ID STAFF (dummy rule)
    if (form.staffId && !form.staffId.startsWith("BSN")) {
      newError.staffId = "ID Staff tidak valid (harus diawali BSN)";
    }

    // 🔥 VALIDASI DOMAIN EMAIL (Saat ini gmail.com, nanti ubah ke btn.co.id)
    const allowedDomain = "@gmail.com";
    if (form.email && !form.email.toLowerCase().endsWith(allowedDomain)) {
      newError.email = `Wajib menggunakan email berakhiran ${allowedDomain}`;
    }

    setError(newError);
    if (Object.keys(newError).length > 0) return;

    setLoading(true);

    try {
      // 1. DAFTARKAN KE SUPABASE AUTH & SISIPKAN METADATA
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            // Data ini akan ditangkap oleh Trigger SQL di database
            username: form.username,
            staff_id: form.staffId,
            unit: form.unit
          },
          emailRedirectTo: `${window.location.origin}/terverifikasi`
        }
      });

      if (authError) throw authError;

      // 🔥 INSERT MANUAL KE TABEL 'user_roles' DIHAPUS DARI SINI
      // Biarkan Database Trigger SQL yang bekerja otomatis di background!

      alert(`Registrasi Berhasil! 🎉\n\nLink verifikasi telah dikirim ke email ${form.email}.\nSilakan cek kotak masuk (atau folder Spam/Junk) Anda dan klik link tersebut sebelum melakukan Login.`);
      navigate("/login"); 

    } catch (err) {
      console.error("Terjadi kesalahan:", err.message);
      alert("Terjadi kesalahan saat pendaftaran: " + err.message);
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

        <div className="relative w-full max-w-[520px] rounded-2xl bg-white px-8 py-8 shadow-2xl">

          {/* CLOSE */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="absolute right-5 top-5 text-xl text-slate-900 transition hover:scale-110 hover:text-[#00634b]"
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
                  placeholder="Masukkan username"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                {error.username && (
                  <p className="text-xs text-red-500 mt-1">{error.username}</p>
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
                  placeholder="Masukkan password"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                {error.password && (
                  <p className="text-xs text-red-500 mt-1">{error.password}</p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-sm font-semibold">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Contoh: budi@gmail.com"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                {error.email && (
                  <p className="text-xs text-red-500 mt-1">{error.email}</p>
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
                  placeholder="Ulangi password"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />
                {error.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    {error.confirmPassword}
                  </p>
                )}
              </div>

              {/* ID STAFF */}
              <div>
                <label className="text-sm font-semibold">ID Staff</label>

                <input
                  name="staffId"
                  value={form.staffId}
                  onChange={handleChange}
                  placeholder="Contoh: BSN-001"
                  className="w-full rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
                />

                {error.staffId && (
                  <p className="text-xs text-red-500 mt-1">{error.staffId}</p>
                )}
              </div>

              {/* UNIT */}
              <div>
                <label className="text-sm font-semibold">Unit</label>
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="w-full cursor-pointer rounded-lg bg-[#e7f0ec] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#00634b]/40"
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
                  <p className="text-xs text-red-500 mt-1">{error.unit}</p>
                )}
              </div>

            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-lg bg-[#00634b] py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#004d3a] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? "Mendaftarkan Akun..." : "Daftar"}
            </button>
          </form>

          {/* FOOTER */}
          <p className="mt-5 text-center text-sm">
            Sudah punya akun?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#00634b] hover:underline"
            >
              Masuk Sekarang
            </Link>
          </p>

        </div>
      </section>
    </main>
  );
}