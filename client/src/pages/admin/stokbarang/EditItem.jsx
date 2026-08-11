import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast'; 

export default function EditItem({ itemData, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    category: '', 
    restockAmount: '',
    location: '', 
    date: '' 
  });
  
  const [loading, setLoading] = useState(false);
  
  // 📍 1. STATE UNTUK MENYIMPAN DAFTAR KATEGORI
  const [kategoriList, setKategoriList] = useState([]);

  // 📍 2. FUNGSI UNTUK MENGAMBIL KATEGORI DARI DATABASE
  useEffect(() => {
    const fetchKategori = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .is('deleted_at', null);
      
      if (!error && data) {
        setKategoriList(data);
      }
    };
    fetchKategori();
  }, []);

  useEffect(() => {
    if (itemData) {
      setFormData({
        id: itemData.id || '',
        name: itemData.name || '',
        category: itemData.category || '',
        restockAmount: '', // 🔥 Dikosongkan setiap kali modal dibuka
        location: itemData.location || '',
        date: itemData.date || '' 
      });
    }
  }, [itemData]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const toastId = toast.loading('Sedang memperbarui data...');

    try {
      // 🔥 LOGIKA PENJUMLAHAN STOK
      const tambahanStok = parseInt(formData.restockAmount) || 0; // Kalau kosong, berarti 0 (tidak ada tambahan)
      const stokLama = parseInt(itemData.stock) || 0;
      const stokBaru = stokLama + tambahanStok; // Sistem otomatis menjumlahkan

      // UPDATE DATA BARANG UTAMA
      const { error } = await supabase
        .from('items')
        .update({
          name: formData.name,
          category: formData.category,
          stock: stokBaru, // Masukkan stok yang sudah dijumlahkan
          location: formData.location || '-',
          date: formData.date,
          status: stokBaru <= 3 ? 'Kritis' : 'Aman'
        })
        .eq('id', formData.id);

      if (error) throw error;

      // 🔥 LOGIKA RESTOCK OTOMATIS: JIKA ADA ANGKA RESTOCK, CATAT KE stock_in
      if (tambahanStok > 0) {
        const { error: logError } = await supabase
          .from('stock_in')
          .insert([
            {
              kode_barang: formData.id,
              jumlah_masuk: tambahanStok,
              keterangan: 'Penambahan stok dari Edit Item'
            }
          ]);

        if (logError) {
          console.error('Gagal mencatat log stok masuk:', logError.message);
        }
      }

      toast.success(`Data item ${formData.id} berhasil diperbarui!`, { id: toastId });
      
      if (onSuccess) onSuccess(); 
      onClose(); 

    } catch (error) {
      console.error('Gagal memperbarui item ke Supabase:', error.message);
      toast.error('Gagal memperbarui database: ' + error.message, { id: toastId });
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
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white" maxLength={50} 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Kategori</label>
              <select 
                required
                value={formData.category} 
                onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] cursor-pointer"
              >
                <option value="" disabled>Pilih Kategori...</option>
                {kategoriList.map((kat, index) => (
                  <option key={index} value={kat.name}>
                    {kat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 🔥 BAGIAN INPUT RESTOCK BARANG */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1 flex items-center justify-between">
                Restock Barang <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Stok saat ini: {itemData?.stock || 0}</span>
              </label>
              <input 
                type="number" 
                min="0"
                placeholder="Ketikan jumlah barang masuk..."
                value={formData.restockAmount} 
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  // Kalau nilainya kosong atau bukan angka, jadikan string kosong
                  setFormData({ ...formData, restockAmount: isNaN(val) ? '' : (val < 0 ? 0 : val) });
                }}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white placeholder:text-zinc-400" 
              />
              <p className="text-[10px] text-zinc-500 mt-1">*Kosongkan jika tidak ada penambahan stok baru.</p>
            </div>
          </div>

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