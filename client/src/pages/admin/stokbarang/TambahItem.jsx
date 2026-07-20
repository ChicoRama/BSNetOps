import React, { useState } from 'react';
import { X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../../../supabaseClient';

export default function TambahItem({ onClose }) {
  // Mengeset default input tanggal ke hari ini
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ 
    name: '', 
    category: 'Elektronik', 
    stock: '', 
    location: '',
    date: today,
    image: null // State baru untuk menyimpan file foto
  });

  const [preview, setPreview] = useState(null); // State untuk menampilkan preview foto

  // Fungsi untuk menangani saat foto dipilih
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      // Membuat URL sementara untuk preview gambar
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Tambah Item Baru</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Masukkan unit aset fisik logistik ke sistem gudang</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); console.log(formData); onClose(); }} className="p-6 space-y-4">
          
          {/* NAMA BARANG */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nama Barang</label>
            <input type="text" required placeholder="Contoh: Lampu Studio Ringlight" className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white" />
          </div>

          {/* KATEGORI & STOK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Kategori</label>
              <select className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]">
                <option>Elektronik</option>
                <option>ATK</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Jumlah Stok Awal</label>
              <input 
                type="number" 
                required 
                min="0"
                value={formData.stock}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFormData({ ...formData, stock: val < 0 ? 0 : e.target.value });
                }}
                placeholder="0" 
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]" 
              />
            </div>
          </div>

          {/* LOKASI & TANGGAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Lokasi Rak/Penyimpanan</label>
              <input 
                type="text" 
                placeholder="Contoh: Rak A-01"
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

          {/* UPLOAD FOTO */}
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Foto Barang</label>
            <div className="relative mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 border-dashed rounded-xl hover:border-[#00664b] transition-colors bg-zinc-50 hover:bg-zinc-100/50 group cursor-pointer overflow-hidden">
              
              {/* Input file disembunyikan tapi menutupi seluruh area */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="space-y-2 text-center relative z-0">
                {preview ? (
                  <div className="flex flex-col items-center">
                    <img src={preview} alt="Preview" className="h-32 object-contain rounded-lg shadow-sm mb-2" />
                    <p className="text-xs font-medium text-[#00664b]">Klik untuk ganti foto</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-zinc-200 rounded-full group-hover:bg-[#00664b]/10 transition-colors mb-2">
                      <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-[#00664b]" />
                    </div>
                    <div className="text-sm text-zinc-600">
                      <span className="font-semibold text-[#00664b]">Klik untuk upload</span> atau drag and drop
                    </div>
                    <p className="text-xs text-zinc-500">PNG, JPG, JPEG (Max. 2MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TOMBOL AKSI */}
          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Batal</button>
            <button type="submit" className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer">
              <Save size={16} /> Simpan Data
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}