import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';

export default function EditUser({ userData, onClose, onSave }) {
  const [formData, setFormData] = useState({ 
    id: '', 
    originalId: '', 
    name: '', 
    email: '', 
    originalEmail: '', // 🔥 Tambahan state buat nyimpen email asli
    role: 'Staff', 
    unit: 'KC Semarang',
    isSuspended: false,
    isDeleted: false 
  });
  
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        id: userData.id || '',
        originalId: userData.originalId || '',
        name: userData.name || '',
        email: userData.email || '',
        originalEmail: userData.email || '', // Simpan referensi email sebelum diedit
        role: userData.role || 'Staff',
        unit: userData.unit || 'KC Semarang',
        isSuspended: userData.isSuspended || false, 
        isDeleted: userData.isDeleted || false 
      });
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Jika email TIDAK BERUBAH, langsung save (kembali ke PengaturanUser)
    if (formData.email.trim() === formData.originalEmail.trim()) {
      onSave(formData);
      return;
    }

    // 2. JIKA EMAIL BERUBAH, panggil Edge Function dulu
    setIsUpdating(true);
    const toastId = toast.loading('Mengupdate email autentikasi...');

    try {
      // Panggil Edge Function
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { 
          oldEmail: formData.originalEmail.trim(), 
          newEmail: formData.email.trim() 
        }
      });

      if (error) throw error;
      
      // Cek respon dari function
      if (data && data.error) {
         throw new Error(data.error);
      }

      // Jika sukses update Auth, lanjut update ke tabel user_roles (via onSave di PengaturanUser)
      toast.success('Email autentikasi berhasil diperbarui!', { id: toastId });
      onSave(formData);

    } catch (err) {
      console.error('Error memanggil Edge Function:', err);
      toast.error(`Gagal merubah email: ${err.message || 'Terjadi kesalahan sistem'}`, { id: toastId });
      setIsUpdating(false); // Buka kembali tombol jika gagal
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Ubah Otorisasi User</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Mengubah konfigurasi akun <span className="font-mono font-bold text-zinc-700">{formData.id}</span></p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isUpdating}
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
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white disabled:opacity-60" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Email Resmi BSN</label>
            <input 
              type="email" 
              required 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white disabled:opacity-60" 
            />
            {formData.email !== formData.originalEmail && (
              <p className="text-[10px] text-amber-600 font-bold mt-1">
                ⚠️ PERINGATAN: Mengubah email akan langsung merubah akses login user ini!
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Hak Akses</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer disabled:opacity-60"
              >
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Unit / Cabang</label>
              <select 
                value={formData.unit} 
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })} 
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer disabled:opacity-60"
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
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Status Keaktifan Akun</label>
            <select 
              value={formData.isSuspended ? "suspended" : "active"} 
              onChange={(e) => setFormData({ ...formData, isSuspended: e.target.value === "suspended" })} 
              disabled={isUpdating}
              className={`w-full px-4 py-2 border rounded-lg text-sm font-semibold focus:outline-none cursor-pointer disabled:opacity-60 ${
                formData.isSuspended ? 'bg-red-50 border-red-300 text-red-600' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              <option value="active">✅ Aktif (Diizinkan Login)</option>
              <option value="suspended">⛔ Ditangguhkan / Suspended (Blokir Login)</option>
            </select>
            <p className="text-[11px] text-zinc-400 mt-1">Jika ditangguhkan, user tidak akan bisa masuk ke dalam sistem saat mencoba login.</p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isUpdating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Check size={16} /> {isUpdating ? 'Memproses...' : 'Perbarui Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}