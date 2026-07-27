import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, Filter, ArrowUpDown, RefreshCw, ArrowLeft, XCircle } from 'lucide-react';
import TambahItem from './TambahItem';
import EditItem from './EditItem';
import { supabase } from '../../../../supabaseClient'; 

export default function StokBarang({ role = 'admin' }) {
  const isAdmin = role === 'admin';
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showTrash, setShowTrash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [sortOrder, setSortOrder] = useState('none');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setItems(data);
    } catch (error) {
      console.error('Gagal mengambil data inventaris:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleSoftDelete = async (id) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus item ${id}? (Data akan dipindahkan ke Trash)`)) {
      try {
        const timestamp = new Date().toISOString();
        const { error } = await supabase
          .from('items')
          .update({ deleted_at: timestamp })
          .eq('id', id);

        if (error) throw error;
        setItems(items.map(item => item.id === id ? { ...item, deleted_at: timestamp } : item));
      } catch (error) {
        console.error('Gagal arsip item:', error.message);
      }
    }
  };

  const handleRestore = async (id) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      setItems(items.map(item => item.id === id ? { ...item, deleted_at: null } : item));
    } catch (error) {
      console.error('Gagal memulihkan item:', error.message);
    }
  };

  // 🔥 CEK APAKAH BARANG PERNAH DIREQUEST SEBELUM HAPUS PERMANEN
  const handleHardDelete = async (item) => {
    try {
      // 1. Cek ke tabel request_items berdasarkan kode barang (id) atau nama barang
      const { count, error: checkError } = await supabase
        .from('request_items')
        .select('*', { count: 'exact', head: true })
        .or(`kode_barang.eq.${item.id},nama_barang.ilike.${item.name}`);

      if (checkError) throw checkError;

      // 2. Jika barang tercatat pernah di-request, blokir hapus permanen!
      if (count && count > 0) {
        alert(`❌ TIDAK BISA DIHAPUS PERMANEN!\n\nBarang "${item.name}" (ID: ${item.id}) sudah pernah diajukan/di-request oleh user dalam riwayat transaksi.\n\nBarang ini hanya diizinkan untuk masuk ke Trash (Soft Delete) demi keamanan data riwayat.`);
        return;
      }

      // 3. Jika belum pernah di-request sama sekali, izinkan hapus permanen
      if (window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus item ${item.id} secara PERMANEN? Data tidak dapat dikembalikan.`)) {
        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', item.id);

        if (deleteError) throw deleteError;
        setItems(items.filter(i => i.id !== item.id));
        alert(`Sukses menghapus permanen item ${item.id}.`);
      }

    } catch (error) {
      console.error('Gagal memeriksa riwayat / menghapus permanen:', error.message);
      alert('Terjadi kesalahan saat memproses data.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const processedItems = items
    .filter(item => (showTrash ? item.deleted_at !== null : item.deleted_at === null))
    .filter(item => (categoryFilter === 'Semua' ? true : item.category === categoryFilter))
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'desc') return b.name.localeCompare(a.name);
      return 0;
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {showTrash && (
            <button onClick={() => setShowTrash(false)} className="p-2 bg-white border border-zinc-200 rounded-xl shadow-md text-[#00664b] hover:bg-emerald-50 transition-all cursor-pointer">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">Manajemen Stok & Inventaris</h2>
            <p className="text-xs text-white/80 mt-0.5">{showTrash ? 'Daftar arsip barang (Trash)' : 'Daftar logistik dan aset operasional'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!showTrash && (
            <button onClick={() => setShowTrash(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer group">
              <Trash2 size={16} /> Trash
            </button>
          )}
          {isAdmin && !showTrash && (
            <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-[#00664b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:bg-[#00553e] transition-all cursor-pointer">
              <Plus size={16} /> Tambah Item Baru
            </button>
          )}
        </div>
      </div>

      {/* Bar Pencarian */}
      <div className="flex bg-white p-4 rounded-xl shadow-md border border-zinc-200/80">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan kode atau nama barang..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#58a27d] text-white text-xs uppercase font-semibold">
            <tr>
              <th className="p-4">Kode</th>
              <th className="p-4">Nama Barang</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Stok</th>
              <th className="p-4">Tanggal Masuk</th>
              {isAdmin && <th className="p-4 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-zinc-400 font-medium bg-zinc-50/30">
                  Memuat data dari database...
                </td>
              </tr>
            ) : processedItems.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-zinc-400 font-medium bg-zinc-50/30">
                  {showTrash ? 'Tidak ada item di dalam Trash.' : 'Tidak ditemukan data item yang cocok.'}
                </td>
              </tr>
            ) : (
              processedItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/40">
                  <td className="p-4 font-mono font-bold text-zinc-900">{item.id}</td>
                  <td className="p-4 font-semibold text-zinc-900">{item.name}</td>
                  <td className="p-4 text-zinc-600">{item.category}</td>
                  <td className="p-4 font-bold">{item.stock} Unit</td>
                  <td className="p-4 text-zinc-600">{formatDate(item.date)}</td>
                  {isAdmin && (
                    <td className="p-4 text-right space-x-2">
                      {showTrash ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleRestore(item.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer">
                            <RefreshCw size={14} /> Restore
                          </button>
                          <button onClick={() => handleHardDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer">
                            <XCircle size={14} /> Hapus Permanen
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(item)} className="p-1.5 text-zinc-500 hover:text-blue-600 cursor-pointer"><Edit3 size={16} /></button>
                          <button onClick={() => handleSoftDelete(item.id)} className="p-1.5 text-zinc-500 hover:text-red-600 cursor-pointer"><Trash2 size={16} /></button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <TambahItem 
          onClose={() => setIsAddOpen(false)} 
          onSuccess={() => {
            setIsAddOpen(false);
            fetchItems(); 
          }} 
        />
      )}
      
      {isEditOpen && (
        <EditItem 
          itemData={selectedItem} 
          onClose={() => setIsEditOpen(false)} 
          onSuccess={() => {
            setIsEditOpen(false);
            fetchItems(); 
          }}
        />
      )}
    </div>
  );
}