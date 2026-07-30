import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast'; // 🔥 Import Toast

export default function TambahUser({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    staff_id: `BSN-${Math.floor(100 + Math.random() * 900)}`, 
    unit: '', 
    role: 'User', 
    status: 'Aktif' 
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 🔥 Mulai animasi loading dari Toast
    const toastId = toast.loading('Mendaftarkan user baru...');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const isSuspended = formData.status === 'Suspend';
      const finalStaffId = formData.staff_id || `BSN-${Math.floor(100 + Math.random() * 900)}`;

      const { error: dbError } = await supabase
        .from('user_roles')
        .insert([
          {
            staff_id: finalStaffId,
            username: formData.name,
            email: formData.email,
            role: formData.role.toLowerCase(),
            unit: formData.unit,
            is_suspended: isSuspended
          }
        ]);

      if (dbError) throw dbError;

      // 🔥 Sukses Toast
      toast.success(`User baru dengan ID ${finalStaffId} berhasil didaftarkan.`, { id: toastId });
      
      if (onSuccess) onSuccess(); 
      onClose(); 

    } catch (error) {
      console.error('Gagal mendaftarkan user baru:', error.message);
      // 🔥 Error Toast
      toast.error(`Gagal mendaftarkan user: ${error.message}`, { id: toastId });
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
            <p className="text-xs text-zinc-500 mt-0.5">Berikan otorisasi masuk sistem logistik kepada pegawai baru</p>
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
              placeholder="admin@bsn.go.id" 
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Password Awal</label>
            <input 
              type="password" 
              required 
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••••" 
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-all" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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