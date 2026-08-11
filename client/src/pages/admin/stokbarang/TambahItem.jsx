import React, { useEffect, useState } from 'react';
import { X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast'; 

export default function TambahItem({ onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ 
    name: '', 
    category: '', 
    stock: '', 
    location: '',
    date: today,
    image: null 
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [kategoriList, setKategoriList] = useState([]);

  // Fetch Kategori dari Database
  useEffect(() => {
    const fetchKategori = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .is('deleted_at', null);

      if (!error && data) {
        setKategoriList(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, category: data[0].name }));
        }
      } else if (error) {
        console.error('Gagal memuat kategori:', error.message);
      }
    };
    fetchKategori();
  }, []);

  // 🔥 Logika Otomatis Kapital di Setiap Awal Kata (Title Case)
  const handleNameChange = (e) => {
    const val = e.target.value;
    const titleCase = val
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    setFormData({ ...formData, name: titleCase });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const toastId = toast.loading('Menyimpan barang baru...');

    try {
      const trimmedName = formData.name.trim();

      // 🔥 Logika Cek Duplikasi Nama Barang
      const { data: existingItems, error: checkError } = await supabase
        .from('items')
        .select('name')
        .ilike('name', trimmedName);

      if (checkError) throw checkError;
      if (existingItems && existingItems.length > 0) {
        throw new Error(`Barang dengan nama "${trimmedName}" sudah terdaftar di gudang!`);
      }

      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
      const idPrefix = `BRG-${dateCode}-`;

      // Cek ID urut berdasarkan hari ini
      const { data: lastItems, error: fetchError } = await supabase
        .from('items')
        .select('id')
        .ilike('id', `${idPrefix}%`) 
        .order('id', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      let nextSequence = 1;
      if (lastItems && lastItems.length > 0) {
        const lastId = lastItems[0].id; 
        const lastThreeDigits = lastId.split('-').pop(); 
        const lastNumber = parseInt(lastThreeDigits, 10);
        
        if (!isNaN(lastNumber)) {
          nextSequence = lastNumber + 1; 
        }
      }

      const formattedSequence = String(nextSequence).padStart(3, '0');
      const generatedId = `${idPrefix}${formattedSequence}`; 

      const jumlahStok = parseInt(formData.stock) || 0;
      let imageUrl = null;

      // Upload Gambar (Jika Ada)
      if (formData.image) {
        const file = formData.image;
        const fileExt = file.name.split('.').pop();
        const fileName = `${generatedId}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('items-bucket') 
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('items-bucket')
          .getPublicUrl(filePath);

        imageUrl = publicURLData.publicUrl;
      }

      // Insert ke tabel items
      const { error: itemError } = await supabase
        .from('items')
        .insert([
          {
            id: generatedId,
            name: trimmedName,
            category: formData.category,
            stock: jumlahStok,
            location: formData.location || '-',
            date: formData.date,
            status: jumlahStok <= 3 ? 'Kritis' : 'Aman',
            image: imageUrl,
            deleted_at: null
          }
        ]);

      if (itemError) throw itemError;

      // Catat stok awal ke tabel stock_in
      if (jumlahStok > 0) {
        const { error: stockInError } = await supabase
          .from('stock_in')
          .insert([
            {
              kode_barang: generatedId,
              jumlah_masuk: jumlahStok,
              keterangan: 'Stok Awal Barang Baru'
            }
          ]);

        if (stockInError) {
          console.error('Gagal mencatat stok awal ke stock_in:', stockInError.message);
        }
      }

      // Insert ke activity_logs
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert([
          {
            transaction_id: generatedId,
            requester: 'Admin Gudang',
            item_name: trimmedName,
            qty: jumlahStok,
            type: 'Masuk',
            status: 'Selesai',
            manager_status: 'Approved',
            admin_status: 'Selesai',
            date: formData.date
          }
        ]);

      if (logError) throw logError;

      toast.success(`Barang "${trimmedName}" berhasil ditambahkan dengan kode ${generatedId}!`, { id: toastId });
      
      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('Gagal menyimpan:', error.message);
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
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
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Nama Barang</label>
            <input 
              type="text" 
              required 
              placeholder="Contoh: Lampu Studio Ringlight" 
              value={formData.name}
              onChange={handleNameChange} // Menggunakan fungsi kapital otomatis
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white" 
              maxLength={50}
            />
          </div>

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
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1">Jumlah Stok Awal</label>
              <input 
                type="number" 
                required 
                min="0"
                value={formData.stock}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setFormData({ ...formData, stock: isNaN(val) ? '' : (val < 0 ? 0 : val) });
                }}
                placeholder="0" 
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Foto Barang</label>
            <div className="relative mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 border-dashed rounded-xl hover:border-[#00664b] transition-colors bg-zinc-50 hover:bg-zinc-100/50 group cursor-pointer overflow-hidden">
              
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

          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Batal</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
              <Save size={16} /> {loading ? 'Mengunggah & Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}