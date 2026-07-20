import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, RefreshCw, ArrowLeft, XCircle } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import TambahKategori from './TambahKategori';
import EditKategori from './EditKategori';

export default function KategoriBarang() {
  const [categories, setCategories] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  // FUNGSI UTAMA: Ambil data dari Supabase
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Error fetching data:", error);
    else setCategories(data || []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setIsEditOpen(true);
  };

  // 1. TAMBAH KATEGORI (CREATE)
  const handleAddCategory = async (newCategory) => {
    const { error } = await supabase.from('categories').insert([newCategory]);
    if (error) {
      alert("Gagal menambah: " + error.message);
    } else {
      fetchCategories(); // Refresh data
      setIsAddOpen(false);
    }
  };

  // 2. UPDATE KATEGORI
  const handleUpdateCategory = async (updated) => {
    const { error } = await supabase
      .from('categories')
      .update({ name: updated.name, description: updated.description })
      .eq('id', updated.id);
      
    if (error) {
      alert("Gagal update: " + error.message);
    } else {
      fetchCategories();
      setIsEditOpen(false);
    }
  };

  // 3. SOFT DELETE (Update deleted_at)
  const handleSoftDeleteCategory = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin memindahkan "${name}" ke Trash?`)) {
      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
        
      if (!error) fetchCategories();
    }
  };

  // 4. RESTORE
  const handleRestoreCategory = async (id) => {
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: null })
      .eq('id', id);
      
    if (!error) fetchCategories();
  };

  // 5. HARD DELETE
  const handleHardDeleteCategory = async (id, name) => {
    if (window.confirm(`PERINGATAN: Hapus PERMANEN "${name}"? Tidak dapat dibatalkan.`)) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) fetchCategories();
    }
  };

  // LOGIKA FILTERING
  const filteredCategories = categories
    .filter(cat => (showTrash ? cat.deleted_at !== null : cat.deleted_at === null))
    .filter(cat =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {showTrash && (
            <button onClick={() => setShowTrash(false)} className="p-2 bg-white border border-zinc-200 text-zinc-600 rounded-xl shadow-md text-[#00805e] transition-all hover:scale-110 cursor-pointer">
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
              <button onClick={() => setShowTrash(true)} className="p-2.5 bg-white text-zinc-700 border border-zinc-200 hover:text-red-600 rounded-xl shadow-xs cursor-pointer">
                <Trash2 size={18} />
              </button>
              <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer">
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
            placeholder="Cari..." 
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
            {filteredCategories.map((cat) => (
              <tr key={cat.id} className="hover:bg-zinc-50/40">
                <td className="p-4 font-mono text-xs font-bold text-zinc-900">{cat.category_code}</td>
                <td className="p-4 font-bold">{cat.name}</td>
                <td className="p-4 text-zinc-600">{cat.description}</td>
                <td className="p-4 text-right space-x-1">
                   {showTrash ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleRestoreCategory(cat.id)} className="text-amber-600 border px-2 py-1 rounded-md text-xs cursor-pointer">Restore</button>
                      <button onClick={() => handleHardDeleteCategory(cat.id, cat.name)} className="text-red-600 border px-2 py-1 rounded-md text-xs cursor-pointer">Hapus</button>
                    </div>
                   ) : (
                    <>
                      <button onClick={() => handleEditClick(cat)} className="p-1.5 text-zinc-500 hover:text-blue-600 cursor-pointer"><Edit3 size={16}/></button>
                      <button onClick={() => handleSoftDeleteCategory(cat.id, cat.name)} className="p-1.5 text-zinc-500 hover:text-red-600 cursor-pointer"><Trash2 size={16}/></button>
                    </>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddOpen && <TambahKategori onClose={() => setIsAddOpen(false)} onSave={handleAddCategory} />}
      {isEditOpen && <EditKategori categoryData={selectedCategory} onSave={handleUpdateCategory} onClose={() => setIsEditOpen(false)} />}
    </div>
  );
}