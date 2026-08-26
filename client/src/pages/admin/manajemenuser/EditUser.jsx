import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, KeyRound, RotateCcw } from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';

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
  
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
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

  const handleInitialSubmit = (e) => {
    e.preventDefault();

    if (newPassword.trim() !== '') {
      if (!formData.email && !formData.originalEmail) {
        toast.error("Email user tidak ditemukan! Tidak bisa mengganti password.");
        return;
      }
      setShowPasswordConfirm(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setIsUpdating(true);
    const toastId = toast.loading('Menyimpan pembaruan akun...');

    try {
      let isPasswordChanged = false; 

      if (newPassword.trim() !== '') {
        const targetEmail = (formData.email || formData.originalEmail || '').trim();
        
        if (!targetEmail) {
          throw new Error("Email user kosong! Sistem Auth butuh email valid.");
        }

        const { data, error } = await supabase.functions.invoke('update-user-password', {
          body: { 
            email: targetEmail, 
            newPassword: newPassword.trim() 
          }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        
        isPasswordChanged = true; 
      }

      toast.success(`Data akun ${formData.name} berhasil diperbarui!`, { id: toastId });
      
      onSave({ ...formData, isPasswordChanged });

    } catch (err) {
      console.error('Error memproses update:', err);
      toast.error(`Gagal menyimpan: ${err.message || 'Terjadi kesalahan sistem'}`, { id: toastId });
      setIsUpdating(false); 
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
            disabled={isUpdating}
            className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleInitialSubmit} className="p-6 space-y-4">
          
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

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Email Sistem (Auth)</label>
            <input 
              type="email" 
              required
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value, originalEmail: e.target.value })} 
              disabled={isUpdating}
              placeholder="Contoh: manager@bsn.local"
              className="w-full px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-700 font-mono focus:outline-none focus:border-[#00664b] focus:bg-white transition-colors disabled:opacity-60" 
            />
          </div>

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
              <option value="suspended">⛔ Ditangguhkan / Suspended (Blokir Login)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-zinc-200 mt-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-bold text-red-600">Reset Password (Opsional)</label>
              {/* 🔥 TOMBOL CEPAT RESET KE 12345678 */}
              <button
                type="button"
                onClick={() => {
                  setNewPassword('12345678');
                  toast.success('Password di-set ke default: 12345678');
                }}
                disabled={isUpdating}
                className="text-xs font-semibold text-[#00664b] hover:text-[#004d38] flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw size={12} /> Default (12345678)
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">Kosongkan kolom ini jika Anda tidak ingin merubah password user.</p>
            <input 
              type="text" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isUpdating}
              placeholder="Ketik password baru atau klik tombol Default..." 
              className="w-full px-4 py-2.5 bg-red-50/30 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:bg-white transition-colors disabled:opacity-60" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isUpdating}
              className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isUpdating}
              className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Check size={16} /> {isUpdating ? 'Memproses...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>

      {showPasswordConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-80 bg-white shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="pt-6 pb-5 px-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-zinc-900">
                Ubah Password
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                Ganti password untuk <span className="font-semibold text-zinc-700">{formData.name}</span>?
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
                onClick={() => {
                  setShowPasswordConfirm(false);
                  executeSave();
                }}
                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#00664b] hover:bg-[#00553e] rounded-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                <KeyRound size={13} /> Ya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}