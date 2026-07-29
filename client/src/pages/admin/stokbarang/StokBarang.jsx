import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, Filter, ArrowUpDown, RefreshCw, ArrowLeft, XCircle, AlertTriangle, X } from 'lucide-react';
import TambahItem from './TambahItem';
import EditItem from './EditItem';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';

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

  // 🔥 State untuk Modal Konfirmasi Custom (Pengganti window.confirm)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger', // 'danger' atau 'warning'
    onConfirm: () => {}
  });

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
      toast.error('Gagal mengambil data inventaris!');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleSoftDelete = async (item) => {
    try {
      const { count, error: checkError } = await supabase
        .from('request_items')
        .select('*', { count: 'exact', head: true })
        .or(`kode_barang.eq.${item.id},nama_barang.ilike.${item.name}`);

      if (checkError) throw checkError;

      if (count && count > 0) {
        toast.error(`TIDAK BISA DIHAPUS!\nBarang "${item.name}" sudah pernah diajukan/di-request.`, { duration: 5000 });
        return;
      }

      // 🔥 Buka Modal Konfirmasi Custom (Soft Delete)
      setConfirmModal({
        isOpen: true,
        title: 'Pindahkan ke Trash?',
        message: `Apakah Anda yakin ingin memindahkan item "${item.name}" (${item.id}) ke tempat sampah?`,
        type: 'warning',
        onConfirm: async () => {
          const timestamp = new Date().toISOString();
          const { error } = await supabase
            .from('items')
            .update({ deleted_at: timestamp })
            .eq('id', item.id);

          if (error) throw error;
          setItems(items.map(i => i.id === item.id ? { ...i, deleted_at: timestamp } : i));
          toast.success(`Barang berhasil dipindahkan ke Trash.`);
          setConfirmModal({ isOpen: false });
        }
      });

    } catch (error) {
      console.error('Gagal arsip item:', error.message);
      toast.error('Terjadi kesalahan saat memeriksa data riwayat.');
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
      toast.success('Barang berhasil dipulihkan!');
    } catch (error) {
      console.error('Gagal memulihkan item:', error.message);
      toast.error('Gagal memulihkan item!');
    }
  };

  const handleHardDelete = async (item) => {
    try {
      const { count, error: checkError } = await supabase
        .from('request_items')
        .select('*', { count: 'exact', head: true })
        .or(`kode_barang.eq.${item.id},nama_barang.ilike.${item.name}`);

      if (checkError) throw checkError;

      if (count && count > 0) {
        toast.error(`TIDAK BISA DIHAPUS PERMANEN!\nBarang "${item.name}" sudah pernah diajukan.`, { duration: 5000 });
        return;
      }

      // 🔥 Buka Modal Konfirmasi Custom (Hard Delete)
      setConfirmModal({
        isOpen: true,
        title: 'Hapus Permanen Barang?',
        message: `PERINGATAN: Item "${item.name}" (${item.id}) akan dihapus secara PERMANEN dari database dan tidak dapat dikembalikan!`,
        type: 'danger',
        onConfirm: async () => {
          const { error: deleteError } = await supabase
            .from('items')
            .delete()
            .eq('id', item.id);

          if (deleteError) throw deleteError;
          setItems(items.filter(i => i.id !== item.id));
          toast.success(`Sukses menghapus permanen item ${item.id}.`);
          setConfirmModal({ isOpen: false });
        }
      });

    } catch (error) {
      console.error('Gagal memeriksa riwayat / menghapus permanen:', error.message);
      toast.error('Terjadi kesalahan saat memproses data.');
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
              <Trash2 size={16} />
            </button>
          )}
          {isAdmin && !showTrash && (
            <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-[#00664b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:bg-[#00553e] transition-all cursor-pointer">
              <Plus size={16} /> Tambah Item Baru
            </button>
          )}
        </div>
      </div>

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
                          <button onClick={() => handleSoftDelete(item)} className="p-1.5 text-zinc-500 hover:text-red-600 cursor-pointer"><Trash2 size={16} /></button>
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

      {/* 🔥 MODAL KONFIRMASI CUSTOM (GAYA BSN MODERN) */}
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
                onClick={() => setConfirmModal({ isOpen: false })} 
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
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