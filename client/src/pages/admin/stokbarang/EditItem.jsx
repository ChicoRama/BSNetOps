import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; // Sesuaikan jalur impor supabaseClient Anda

export default function EditItem({ itemData, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    category: 'Elektronik', 
    stock: '', 
    location: '', 
    date: '' 
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (itemData) {
      setFormData({
        id: itemData.id || '',
        name: itemData.name || '',
        category: itemData.category || 'Elektronik',
        stock: itemData.stock || 0,
        location: itemData.location || '',
        date: itemData.date || '' 
      });
    }
  }, [itemData]);

  // FUNGSI UPDATE DATA KE SUPABASE
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: formData.name,
          category: formData.category,
          stock: parseInt(formData.stock) || 0,
          location: formData.location || '-',
          date: formData.date,
          status: parseInt(formData.stock) <= 3 ? 'Kritis' : 'Aman'
        })
        .eq('id', formData.id);

      if (error) throw error;

      alert(`Sukses! Data item ${formData.id} berhasil diperbarui.`);
      
      if (onSuccess) onSuccess(); // Refresh tabel di halaman utama
      onClose(); // Tutup modal edit

    } catch (error) {
      console.error('Gagal memperbarui item ke Supabase:', error.message);
      alert('Terjadi kesalahan saat memperbarui database: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Ubah Data Barang</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Mengubah info aset dengan kode unik <span className="font-mono font-bold text-zinc-700">{formData.id}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nama Barang</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Kategori</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] cursor-pointer"
              >
                <option value="Elektronik">Elektronik</option>
                <option value="ATK">ATK</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Jumlah Stok</label>
              <input 
                type="number" 
                required 
                min="0"
                value={formData.stock} 
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFormData({ ...formData, stock: isNaN(val) ? '' : (val < 0 ? 0 : val) });
                }}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]" 
              />
            </div>
          </div>

          {/* Baris Input Lokasi & Tanggal Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Lokasi Rak/Penyimpanan</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white text-zinc-700" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Tanggal Masuk</label>
              <input 
                type="date" 
                required 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white text-zinc-700" 
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Batal</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
              <Check size={16} /> {loading ? 'Memperbarui...' : 'Perbarui Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}