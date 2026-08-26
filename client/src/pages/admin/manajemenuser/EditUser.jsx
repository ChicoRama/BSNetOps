import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, KeyRound } from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';

const DEFAULT_RESET_PASSWORD = '12345678';

export default function EditUser({ userData, onClose, onSave }) {
  const [formData, setFormData] = useState({ 
    id: '', 
    originalId: '', 
    name: '', 
    email: '', 
    originalEmail: '', 
    role: 'User', 
    unit: 'KC Semarang',
    unit_kerja: 'CWO',
    isSuspended: false,
    isDeleted: false 
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  useEffect(() => {
    if (userData) {
      // 🔥 Paksa ambil email dari userData, kalau kosong fallback ke email kamu
      const resolvedEmail = userData.email || userData.mail || userData.originalEmail || 'chicoramadhan8@gmail.com';

      setFormData({
        id: userData.id || '',
        originalId: userData.originalId || '',
        name: userData.name || '',
        email: resolvedEmail,
        originalEmail: resolvedEmail, 
        role: userData.role || 'User', 
        unit: userData.unit || 'KC Semarang',
        unit_kerja: userData.unit_kerja || 'CWO', 
        isSuspended: userData.isSuspended || false, 
        isDeleted: userData.isDeleted || false 
      });
    }
  }, [userData]);

  const fetchEmailFromDB = async (identifier) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('email')
        .or(`staff_id.eq.${identifier},nama_lengkap.eq.${identifier},username.eq.${identifier}`)
        .maybeSingle();

      if (data && data.email) {
        setFormData(prev => ({
          ...prev,
          email: data.email,
          originalEmail: data.email
        }));
      }
    } catch (err) {
      console.error("Gagal menarik email otomatis:", err);
    }
  };

  // 🔥 Submit form utama HANYA menyimpan data profil (nama, email, role, unit,
  // unit kerja, status). Reset password sekarang jadi aksi TERPISAH lewat
  // tombol merah di bawah, tidak lagi tercampur dengan form ini.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const toastId = toast.loading('Menyimpan pembaruan akun...');

    try {
      onSave({ ...formData, isPasswordChanged: false });
      toast.success(`Data akun ${formData.name} berhasil diperbarui!`, { id: toastId });
    } catch (err) {
      console.error('Error memproses update:', err);
      toast.error(`Gagal menyimpan: ${err.message || 'Terjadi kesalahan sistem'}`, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  // 🔥 Klik tombol merah -> buka popup konfirmasi dulu
  const handleResetPasswordClick = () => {
    const targetEmail = (formData.email || formData.originalEmail || '').trim();
    if (!targetEmail) {
      toast.error("Email user tidak ditemukan! Tidak bisa mereset password.");
      return;
    }
    setShowPasswordConfirm(true);
  };

  // 🔥 Setelah user konfirmasi di popup -> langsung reset password ke default,
  // TANPA perlu klik "Simpan Perubahan" lagi.
  const confirmResetPassword = async () => {
    setShowPasswordConfirm(false);
    setIsResettingPassword(true);
    const toastId = toast.loading('Mereset password user...');

    try {
      const targetEmail = (formData.email || formData.originalEmail || '').trim();

      if (!targetEmail) {
        throw new Error("Email user kosong! Sistem Auth butuh email valid.");
      }

      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { 
          email: targetEmail, 
          newPassword: DEFAULT_RESET_PASSWORD 
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      toast.success(
        (t) => (
          <div>
            <b className="text-[#00664b] font-bold text-sm">Password Berhasil Direset!</b>
            <p className="text-xs mt-1 text-slate-600">
              Password {formData.name} sekarang: <span className="font-mono font-bold">{DEFAULT_RESET_PASSWORD}</span>
            </p>
          </div>
        ),
        { id: toastId, duration: 5000 }
      );
    } catch (err) {
      console.error('Gagal mereset password:', err);
      toast.error(`Gagal mereset password: ${err.message || 'Terjadi kesalahan sistem'}`, { id: toastId });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Ubah Otorisasi User</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Mengubah konfigurasi akun <span className="font-mono font-bold text-zinc-700">{formData.id}</span></p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isUpdating || isResettingPassword}
            className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              disabled={isUpdating}
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-colors disabled:opacity-60" 
            />
          </div>

          {/* 🔥 BARIS 1: Unit/Cabang (Kiri) & Unit Kerja (Kanan) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Unit / Cabang</label>
              <select 
                value={formData.unit} 
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })} 
                disabled={isUpdating}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-colors disabled:opacity-60"
              >
                <option value="KC Semarang">KC Semarang</option>
                <option value="KCP Majapahit">KCP Majapahit</option>
                <option value="KCP Ngaliyan">KCP Ngaliyan</option>
                <option value="KCP Ungaran">KCP Ungaran</option>
                <option value="KCP Kendal">KCP Kendal</option>
                <option value="KCP Kudus">KCP Kudus</option>
                <option value="KCP Magelang">KCP Magelang</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Unit Kerja</label>
              <select 
                value={formData.unit_kerja} 
                onChange={(e) => setFormData({ ...formData, unit_kerja: e.target.value })} 
                disabled={isUpdating}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-colors disabled:opacity-60"
                required
              >
                <option value="" disabled hidden>Pilih Unit Kerja</option>
                <option value="Admin">Admin</option>
                <option value="CWO">CWO</option>
                <option value="FA & FD">FA & FD</option>
                <option value="Accounting">Accounting</option>
                <option value="Operasional">Operasional</option>
                <option value="Teller">Teller</option>
                <option value="FS">FS</option>
                <option value="CS">CS</option>
                <option value="Commercial">Commercial</option>
                <option value="Sekretaris">Sekretaris</option>
                <option value="Funding">Funding</option>
                <option value="Consumer">Consumer</option>
                {formData.unit_kerja && !["Admin", "CWO", "FA & FD", "Accounting", "Operasional", "Teller", "FS", "CS", "Commercial", "Sekretaris", "Funding", "Consumer", ""].includes(formData.unit_kerja) && (
                  <option value={formData.unit_kerja}>{formData.unit_kerja}</option>
                )}
              </select>
            </div>
          </div>

          {/* 🔥 BARIS 2: Hak Akses (Kiri) & Status Akun (Kanan) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Hak Akses</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                disabled={isUpdating}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-colors disabled:opacity-60"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Status Keaktifan Akun</label>
              <select 
                value={formData.isSuspended ? "suspended" : "active"} 
                onChange={(e) => setFormData({ ...formData, isSuspended: e.target.value === "suspended" })} 
                disabled={isUpdating}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-semibold focus:outline-none cursor-pointer transition-colors disabled:opacity-60 ${
                  formData.isSuspended ? 'bg-red-50 border-red-300 text-red-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}
              >
                <option value="active">✅ Aktif (Diizinkan Login)</option>
                <option value="suspended">⛔ Ditangguhkan (Blokir Login)</option>
              </select>
            </div>
          </div>

          {/* 🔥 Reset Password sekarang cuma 1 tombol merah, aksi independen
              dari form utama. Klik -> popup konfirmasi -> langsung reset
              ke password default (12345678) tanpa perlu klik "Simpan Perubahan". */}
          <div className="pt-4 border-t border-zinc-200 mt-2">
            <label className="block text-sm font-bold text-red-600 mb-1">Reset Password</label>
            <p className="text-[11px] text-zinc-500 mb-2">
              Password user akan langsung direset ke default: <span className="font-mono font-bold">{DEFAULT_RESET_PASSWORD}</span>
            </p>
            <button
              type="button"
              onClick={handleResetPasswordClick}
              disabled={isUpdating || isResettingPassword}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <KeyRound size={16} /> {isResettingPassword ? 'Mereset...' : 'Reset Password ke Default'}
            </button>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isUpdating || isResettingPassword}
              className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isUpdating || isResettingPassword}
              className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Check size={16} /> {isUpdating ? 'Memproses...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>

      {/* 🔥 POPUP KONFIRMASI RESET PASSWORD */}
      {showPasswordConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-80 bg-white shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="pt-6 pb-5 px-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-bold text-zinc-900">
                Reset Password ke Default?
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                Password untuk <span className="font-semibold text-zinc-700">{formData.name}</span> akan langsung diganti menjadi <span className="font-mono font-bold text-red-600">{DEFAULT_RESET_PASSWORD}</span>. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(false)}
                className="flex-1 py-2.5 text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmResetPassword}
                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <KeyRound size={13} /> Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}