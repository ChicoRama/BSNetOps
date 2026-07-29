import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import TambahKategori from './TambahKategori';
import EditKategori from './EditKategori';
import toast from 'react-hot-toast'; // 🔥 Import Toast

export default function KategoriBarang() {
  const [categories, setCategories] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  // 🔥 State untuk Modal Konfirmasi Custom
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {}
  });

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data kategori!");
    } else {
      setCategories(data || []);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setIsEditOpen(true);
  };

  const handleAddCategory = async (newCategory) => {
    const toastId = toast.loading('Menambahkan kategori...');
    try {
      const { data: existingCats, error: checkError } = await supabase
        .from('categories')
        .select('name, deleted_at')
        .ilike('name', newCategory.name); 

      if (checkError) throw checkError;

      if (existingCats && existingCats.length > 0) {
        const isTrashed = existingCats.some(cat => cat.deleted_at !== null);
        
        if (isTrashed) {
          toast.error(`Kategori "${newCategory.name}" ada di dalam Trash. Restore terlebih dahulu!`, { id: toastId, duration: 5000 });
        } else {
          toast.error(`Kategori "${newCategory.name}" sudah ada dan aktif.`, { id: toastId });
        }
        return; 
      }

      const { error } = await supabase.from('categories').insert([newCategory]);
      if (error) throw error;
      
      toast.success(`Kategori "${newCategory.name}" berhasil ditambahkan!`, { id: toastId });
      fetchCategories(); 
      setIsAddOpen(false); 

    } catch (error) {
      console.error("Gagal menambah kategori:", error.message);
      toast.error("Gagal menambah kategori: " + error.message, { id: toastId });
    }
  };

  const handleUpdateCategory = async (updated) => {
    const toastId = toast.loading('Memperbarui kategori...');
    const { error } = await supabase
      .from('categories')
      .update({ name: updated.name, description: updated.description })
      .eq('id', updated.id);
      
    if (error) {
      toast.error("Gagal update: " + error.message, { id: toastId });
    } else {
      toast.success("Kategori berhasil diperbarui!", { id: toastId });
      fetchCategories();
      setIsEditOpen(false);
    }
  };

  const handleSoftDeleteCategory = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Pindahkan ke Trash?',
      message: `Apakah Anda yakin ingin memindahkan "${name}" ke Trash? Barang dengan kategori ini akan sementara berubah menjadi "-".`,
      type: 'warning',
      onConfirm: async () => {
        const toastId = toast.loading('Memindahkan ke Trash...');
        try {
          await supabase
            .from('items')
            .update({ previous_category: name, category: '-' })
            .eq('category', name);

          const { error } = await supabase
            .from('categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
            
          if (error) throw error;
          toast.success(`Kategori "${name}" dipindahkan ke Trash.`, { id: toastId });
          fetchCategories();
          setConfirmModal({ isOpen: false });
        } catch (error) {
          console.error("Gagal memindahkan ke trash:", error.message);
          toast.error("Gagal memindahkan ke trash.", { id: toastId });
        }
      }
    });
  };

  const handleRestoreCategory = async (id, name) => {
    const toastId = toast.loading('Memulihkan kategori...');
    try {
      await supabase
        .from('items')
        .update({ category: name, previous_category: null })
        .eq('previous_category', name);

      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: null })
        .eq('id', id);
        
      if (error) throw error;
      toast.success(`Kategori "${name}" berhasil dipulihkan!`, { id: toastId });
      fetchCategories();
    } catch (error) {
      console.error("Gagal merestore kategori:", error.message);
      toast.error("Gagal merestore kategori.", { id: toastId });
    }
  };

  const handleHardDeleteCategory = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Permanen Kategori?',
      message: `PERINGATAN: Hapus PERMANEN "${name}"? Data ini tidak dapat dibatalkan, dan memori kategori barang akan dihapus selamanya.`,
      type: 'danger',
      onConfirm: async () => {
        const toastId = toast.loading('Menghapus permanen...');
        try {
          const { error: updateItemsError } = await supabase
            .from('items')
            .update({ category: '-', previous_category: null })
            .or(`category.eq.${name},previous_category.eq.${name}`); 

          if (updateItemsError) throw updateItemsError;

          const { error: deleteCatError } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

          if (deleteCatError) throw deleteCatError;

          toast.success(`Kategori "${name}" berhasil dihapus permanen.`, { id: toastId });
          fetchCategories(); 
          setConfirmModal({ isOpen: false });
        } catch (error) {
          console.error("Gagal menghapus permanen kategori:", error.message);
          toast.error("Gagal menghapus: " + error.message, { id: toastId });
        }
      }
    });
  };

  const filteredCategories = categories
    .filter(cat => (showTrash ? cat.deleted_at !== null : cat.deleted_at === null))
    .filter(cat =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.category_code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cat.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {showTrash && (
            <button type="button" onClick={() => setShowTrash(false)} className="p-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl shadow-md text-[#00805e] transition-all hover:scale-110 cursor-pointer">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">Kategori Barang Inventaris</h2>
            <p className="text-xs text-white/80 mt-0.5">{showTrash ? 'Arsip Trash' : 'Kelola kategori aset'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!showTrash && (
            <>
              <button type="button" onClick={() => setShowTrash(true)} className="p-2.5 bg-white text-zinc-700 border border-zinc-200 hover:text-red-600 rounded-xl shadow-xs cursor-pointer">
                <Trash2 size={18} />
              </button>
              <button type="button" onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer">
                <Plus size={16} /> Tambah Kategori
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex bg-white p-4 rounded-xl shadow-md border border-zinc-200/80">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input 
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kategori..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]"
          />
        </div>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#58a27d] text-white text-xs uppercase font-semibold">
            <tr>
              <th className="p-4 w-32">ID</th>
              <th className="p-4 w-48">Nama</th>
              <th className="p-4">Deskripsi</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-12 text-center text-zinc-400 font-medium bg-zinc-50/30">
                  {showTrash ? 'Trash kosong.' : 'Tidak ada kategori ditemukan.'}
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50/40">
                  <td className="p-4 font-mono text-xs font-bold text-zinc-900">{cat.category_code || cat.id.slice(0, 8)}</td>
                  <td className="p-4 font-bold">{cat.name}</td>
                  <td className="p-4 text-zinc-600">{cat.description}</td>
                  <td className="p-4 text-right space-x-1">
                     {showTrash ? (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleRestoreCategory(cat.id, cat.name)} className="text-amber-600 border px-2 py-1 rounded-md text-xs font-semibold hover:bg-amber-50 cursor-pointer transition-colors">Restore</button>
                        <button type="button" onClick={() => handleHardDeleteCategory(cat.id, cat.name)} className="text-red-600 border px-2 py-1 rounded-md text-xs font-semibold hover:bg-red-50 cursor-pointer transition-colors">Hapus</button>
                      </div>
                     ) : (
                      <>
                        <button type="button" onClick={() => handleEditClick(cat)} className="p-1.5 text-zinc-500 hover:text-blue-600 cursor-pointer transition-colors"><Edit3 size={16}/></button>
                        <button type="button" onClick={() => handleSoftDeleteCategory(cat.id, cat.name)} className="p-1.5 text-zinc-500 hover:text-red-600 cursor-pointer transition-colors"><Trash2 size={16}/></button>
                      </>
                     )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 🔥 MODAL KONFIRMASI CUSTOM */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-3">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">{confirmModal.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed px-2">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setConfirmModal({ isOpen: false })} 
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={confirmModal.onConfirm} 
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                  confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00664b] hover:bg-[#00553e]'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && <TambahKategori onClose={() => setIsAddOpen(false)} onSave={handleAddCategory} />}
      {isEditOpen && <EditKategori categoryData={selectedCategory} onSave={handleUpdateCategory} onClose={() => setIsEditOpen(false)} />}
    </div>
  );
}