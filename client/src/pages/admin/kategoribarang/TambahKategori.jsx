import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TambahKategori({ onClose, onSave }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '',
    category_code: '' 
  });

  // 🔥 Generator otomatis kode BSN-XX (Contoh: Elektronik -> BSN-EL, ATK -> BSN-ATK)
  useEffect(() => {
    const generateCode = (name) => {
      if (!name) return '';
      const cleanName = name.trim().toUpperCase();
      const prefix = "BSN-";
      // Jika panjang kata <= 3 (seperti ATK), ambil semuanya. Jika lebih, ambil 2 huruf awal (seperti EL untuk Elektronik)
      const suffix = cleanName.length <= 3 ? cleanName : cleanName.substring(0, 2);
      return `${prefix}${suffix}`;
    };

    setFormData(prev => ({
      ...prev,
      category_code: generateCode(prev.name)
    }));
  }, [formData.name]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nama kategori wajib diisi!');
      return;
    }

    // 🔥 Gunakan kode kategori yang digenerate otomatis (BSN-EL, BSN-ATK, dll)
    const newCategory = {
      category_code: formData.category_code || 'BSN-GEN', 
      name: formData.name,
      description: formData.description,
    };

    onSave(newCategory); 
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Tambah Kategori Baru</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Buat kelompok klasifikasi baru untuk manajemen logistik gudang</p>
          </div>
          <button 
            type="button" 
            onClick={(e) => { e.preventDefault(); onClose(); }} 
            className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-zinc-700">Nama Kategori</label>
              {/* Preview Kode Otomatis */}
              {formData.category_code && (
                <span className="text-[11px] font-mono font-bold text-[#00664b] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Kode: {formData.category_code}
                </span>
              )}
            </div>
            <input 
              type="text" 
              required 
              placeholder="Contoh: Elektronik atau ATK" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Deskripsi Ruang Lingkup</label>
            <textarea 
              required 
              rows="4" 
              placeholder="Jelaskan jenis barang apa saja yang masuk dalam kategori klasifikasi ini..." 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white resize-none"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); onClose(); }} 
              className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save size={16} /> Simpan Kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}