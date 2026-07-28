import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

// Menerima prop onSave dari parent
export default function EditKategori({ categoryData, onClose, onSave }) {
  const [formData, setFormData] = useState({ id: '', name: '', description: '', deleted_at: null });

  useEffect(() => {
    if (categoryData) {
      setFormData({
        id: categoryData.id || '',
        name: categoryData.name || '',
        description: categoryData.description || '',
        deleted_at: categoryData.deleted_at || null // Amankan statuts deleted_at agar tidak hilang saat update
      });
    }
  }, [categoryData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData); // Kirim form data kembali ke KategoriBarang.jsx
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Ubah Detail Kategori</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Memperbarui rincian kategori kelompok <span className="font-mono font-bold text-zinc-700">{formData.id}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Menggunakan handleSubmit yang memanggil onSave */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nama Kategori</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Deskripsi Ruang Lingkup</label>
            <textarea required rows="4" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white resize-none"></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Batal</button>
            <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer">
              <Check size={16} /> Perbarui Kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}