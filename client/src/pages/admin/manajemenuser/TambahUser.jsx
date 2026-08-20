import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';

export default function TambahUser({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    staff_id: `BSN-${Math.floor(100 + Math.random() * 900)}`, 
    unit: '', 
    role: 'User', // 👈 Defaultnya sekarang User
    status: 'Aktif' 
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading('Mendaftarkan user baru...');

    try {
      // 1. Daftarkan ke sistem Auth dengan password hardcode "12345678"
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: '12345678', 
      });

      if (authError) throw authError;

      const isSuspended = formData.status === 'Suspend';
      const finalStaffId = formData.staff_id || `BSN-${Math.floor(100 + Math.random() * 900)}`;

      // 2. Insert data profil + set is_first_login = true
      const { error: dbError } = await supabase
        .from('user_roles')
        .upsert([
          {
            id: authData.user?.id, 
            staff_id: finalStaffId,
            username: formData.name,
            email: formData.email,
            role: formData.role.toLowerCase(), // Akan otomatis jadi 'user', 'manager', atau 'admin'
            unit: formData.unit,
            is_suspended: isSuspended,
            is_first_login: true 
          }
        ], { onConflict: 'email' }); 

      if (dbError) throw dbError;

      toast.success(`User baru dengan ID ${finalStaffId} berhasil didaftarkan. Password: 12345678`, { id: toastId, duration: 4000 });
      
      if (onSuccess) onSuccess(); 
      onClose(); 

    } catch (error) {
      console.error('Gagal mendaftarkan user baru:', error.message);
      
      let errorMessage = error.message;
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        errorMessage = 'Data nyangkut! Email ini sudah tercatat di database.';
      } else if (errorMessage.toLowerCase().includes('already registered')) {
        errorMessage = 'Email sudah digunakan! Silakan gunakan email lain.';
      }

      toast.error(`Gagal: ${errorMessage}`, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-950">Daftarkan User Baru</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Password default akun adalah <span className="font-mono font-bold text-red-500 bg-red-50 px-1 rounded">12345678</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Setiawan" 
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Email Resmi BSN</label>
            <input 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="xxxx@gmail.com" 
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-all" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Hak Akses</label>
              <select 
                required
                value={formData.role} 
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-all"
              >
                <option value="User">User</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Unit / Cabang</label>
              <select 
                required
                value={formData.unit} 
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-all"
              >
                <option value="" disabled hidden>Pilih Unit / Cabang</option>
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
            <label className="block text-xs font-bold text-zinc-700 mb-1">Status Awal</label>
            <select 
              value={formData.status} 
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer"
            >
              <option value="Aktif">Aktif</option>
              <option value="Suspend">Suspend</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 mt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}