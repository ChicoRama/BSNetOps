import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, ArrowLeft, XCircle, AlertTriangle, RefreshCw, Download, Calendar } from 'lucide-react';
import TambahItem from './TambahItem';
import EditItem from './EditItem';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';
import { generateLaporanExcel } from './TemplateLaporanExcel';

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

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('bulanan'); 
  const [exportMonth, setExportMonth] = useState(new Date().getMonth()); 
  const [exportYear, setExportYear] = useState(new Date().getFullYear()); 

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => {}
  });

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('realtime-stok-barang')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchItems(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchItems = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setItems(data);
    } catch (error) {
      console.error('Gagal mengambil data:', error.message);
      if (!isBackground) toast.error('Gagal mengambil data inventaris!');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleEditClick = (item) => { setSelectedItem(item); setIsEditOpen(true); };

  const handleSoftDelete = async (item) => {
    try {
      const { count } = await supabase.from('request_items').select('*', { count: 'exact', head: true }).eq('kode_barang', item.id);
      if (count > 0) return toast.error(`TIDAK BISA DIHAPUS!\nBarang "${item.name}" sudah pernah di-request.`, { duration: 3000 });

      setConfirmModal({
        isOpen: true, title: 'Pindahkan ke Trash?', message: `Pindahkan "${item.name}" ke tempat sampah?`, type: 'warning',
        onConfirm: async () => {
          const timestamp = new Date().toISOString();
          await supabase.from('items').update({ deleted_at: timestamp }).eq('id', item.id);
          setItems(items.map(i => i.id === item.id ? { ...i, deleted_at: timestamp } : i));
          toast.success(`Berhasil dipindahkan ke Trash.`);
          setConfirmModal({ isOpen: false });
        }
      });
    } catch (error) { toast.error('Terjadi kesalahan saat arsip.'); }
  };

  const handleRestore = async (id) => {
    try {
      await supabase.from('items').update({ deleted_at: null }).eq('id', id);
      setItems(items.map(item => item.id === id ? { ...item, deleted_at: null } : item));
      toast.success('Barang berhasil dipulihkan!');
    } catch (error) { toast.error('Gagal memulihkan item!'); }
  };

  const handleHardDelete = async (item) => {
    setConfirmModal({
      isOpen: true, title: 'Hapus Permanen?', message: `PERINGATAN: "${item.name}" akan dihapus permanen!`, type: 'danger',
      onConfirm: async () => {
        await supabase.from('items').delete().eq('id', item.id);
        setItems(items.filter(i => i.id !== item.id));
        toast.success(`Dihapus permanen.`);
        setConfirmModal({ isOpen: false });
      }
    });
  };

  // 🔥 Fungsi Export Laporan Opname (Dilengkapi Error Checker)
  const exportLaporanOpname = async () => {
    setIsExportModalOpen(false); 
    const toastId = toast.loading('Menyiapkan rekapitulasi stok yang cantik...');
    
    try {
      let startOfPeriod, endOfPeriod, namaPeriode;

      if (exportType === 'tahunan') {
        startOfPeriod = new Date(exportYear, 0, 1).toISOString();
        endOfPeriod = new Date(exportYear, 11, 31, 23, 59, 59, 999).toISOString();
        namaPeriode = `Tahun_${exportYear}`;
      } else {
        startOfPeriod = new Date(exportYear, exportMonth, 1).toISOString();
        endOfPeriod = new Date(exportYear, exportMonth + 1, 0, 23, 59, 59, 999).toISOString();
        namaPeriode = new Date(exportYear, exportMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      }

      const validItems = items.filter(item => item.deleted_at === null && new Date(item.created_at) <= new Date(endOfPeriod));

      if (validItems.length === 0) {
        toast.error(`Data kosong di ${namaPeriode.replace('_', ' ')}.`, { id: toastId });
        return; 
      }

      // 🔥 Tarik Log Keluar (Request)
      const { data: reqData, error: reqErr } = await supabase.from('request_items').select(`kode_barang, jumlah_diminta, jumlah_disetujui, requests (status)`).gte('created_at', startOfPeriod).lte('created_at', endOfPeriod);
      if (reqErr) throw new Error(`Tabel request bermasalah: ${reqErr.message}`);
      const validReqData = reqData || [];

      // 🔥 Tarik Log Masuk (Stock In)
      const { data: inData, error: inErr } = await supabase.from('stock_in').select('kode_barang, jumlah_masuk').gte('created_at', startOfPeriod).lte('created_at', endOfPeriod);
      if (inErr) throw new Error(`Tabel stock_in bermasalah: ${inErr.message}`);
      const validInData = inData || [];

      const opnameData = validItems.map((item, index) => {
        const totalKeluar = validReqData.filter(r => r.kode_barang === item.id).reduce((sum, curr) => {
          const status = (curr.requests?.status || '').toLowerCase();
          if (status.includes('setuju') || status.includes('selesai') || status.includes('approve')) {
             return sum + Number(curr.jumlah_disetujui ?? curr.jumlah_diminta ?? 0);
          }
          return sum; 
        }, 0);

        const totalMasuk = validInData.filter(r => r.kode_barang === item.id).reduce((sum, curr) => sum + Number(curr.jumlah_masuk || 0), 0);
        
        const stokSekarang = Number(item.stock || 0);
        const stokAwal = stokSekarang - totalMasuk + totalKeluar;

        return {
          no: index + 1,
          kode: item.id,
          nama: item.name,
          kategori: item.category,
          awal: stokAwal,
          masuk: totalMasuk,
          keluar: totalKeluar,
          akhir: stokSekarang,
        };
      });

      await generateLaporanExcel(opnameData, namaPeriode, toastId);

    } catch (error) { 
      toast.error(`Gagal Laporan: ${error.message}`, { id: toastId, duration: 6000 }); 
    }
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const processedItems = items
    .filter(item => (showTrash ? item.deleted_at !== null : item.deleted_at === null))
    .filter(item => (categoryFilter === 'Semua' ? true : item.category === categoryFilter))
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : sortOrder === 'desc' ? b.name.localeCompare(a.name) : 0);

  const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tahunList = Array.from({length: new Date().getFullYear() - 2025}, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 relative px-2 md:px-0">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showTrash && (
            <button onClick={() => setShowTrash(false)} className="p-2 bg-white border border-zinc-200 rounded-xl shadow-md text-[#00664b] hover:bg-emerald-50 transition-all cursor-pointer shrink-0">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Manajemen Stok & Inventaris</h2>
            <p className="text-[11px] md:text-xs text-white/80 mt-0.5">{showTrash ? 'Daftar arsip barang' : 'Daftar logistik dan aset operasional'}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full md:w-auto mt-2 md:mt-0">
          {isAdmin && !showTrash && (
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white text-[#00664b] border border-zinc-200 rounded-xl text-xs md:text-sm font-semibold shadow-sm hover:bg-emerald-50 transition-all cursor-pointer w-full sm:w-auto">
              <Download size={16} /> Laporan Opname
            </button>
          )}

          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
            {!showTrash && (
              <button onClick={() => setShowTrash(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl text-xs md:text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer shadow-sm">
                <Trash2 size={16} />
              </button>
            )}
            
            {isAdmin && !showTrash && (
              <button onClick={() => setIsAddOpen(true)} className="flex-[2] sm:flex-none flex items-center justify-center gap-2 bg-[#00664b] text-white px-3.5 md:px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold shadow-md hover:bg-[#00553e] transition-all cursor-pointer">
                <Plus size={16} /> Tambah Item Baru
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex bg-white p-3 md:p-4 rounded-xl shadow-md border border-zinc-200/80">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari berdasarkan kode atau nama barang..." className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs md:text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-colors" />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left min-w-[700px]">
            <thead className="bg-[#58a27d] text-white text-[10px] md:text-xs uppercase font-semibold tracking-wider">
              <tr>
                <th className="p-3.5 md:p-4">Kode</th>
                <th className="p-3.5 md:p-4">Nama Barang</th>
                <th className="p-3.5 md:p-4">Kategori</th>
                <th className="p-3.5 md:p-4">Stok</th>
                <th className="p-3.5 md:p-4">Tanggal Masuk</th>
                {isAdmin && <th className="p-3.5 md:p-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400 font-medium">Memuat data...</td></tr>
              ) : processedItems.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400 font-medium">Tidak ditemukan data.</td></tr>
              ) : (
                processedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/40 transition-colors">
                    <td className="p-3.5 md:p-4 font-mono font-bold text-zinc-900">{item.id}</td>
                    <td className="p-3.5 md:p-4 font-semibold text-zinc-900">{item.name}</td>
                    <td className="p-3.5 md:p-4 text-zinc-600">{item.category}</td>
                    <td className="p-3.5 md:p-4 font-bold">{item.stock} Unit</td>
                    <td className="p-3.5 md:p-4 text-zinc-600">{formatDate(item.date)}</td>
                    {isAdmin && (
                      <td className="p-3.5 md:p-4 text-right space-x-2 flex justify-end gap-1.5">
                        {showTrash ? (
                          <>
                            <button onClick={() => handleRestore(item.id)} className="px-2.5 py-1 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1 text-[10px] md:text-xs font-semibold cursor-pointer transition-colors"><RefreshCw size={13} /> Restore</button>
                            <button onClick={() => handleHardDelete(item)} className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 text-[10px] md:text-xs font-semibold cursor-pointer transition-colors"><XCircle size={13} /> Hapus</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditClick(item)} className="p-1.5 text-zinc-500 hover:text-blue-600 transition-colors cursor-pointer bg-zinc-50 hover:bg-blue-50 rounded-lg" title="Edit">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleSoftDelete(item)} className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors cursor-pointer bg-zinc-50 hover:bg-red-50 rounded-lg" title="Arsip ke Trash">
                              <Trash2 size={16} />
                            </button>
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
      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 md:p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Calendar size={20} /></div>
              <div><h3 className="text-base md:text-lg font-bold text-zinc-900">Pilih Periode Laporan</h3><p className="text-[11px] md:text-xs text-zinc-500">Rekapitulasi masuk & keluar.</p></div>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Jenis Rekap</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setExportType('bulanan')} className={`py-2 text-[11px] md:text-xs font-bold rounded-xl border transition-all cursor-pointer ${exportType === 'bulanan' ? 'bg-[#00664b] text-white border-[#00664b]' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>Bulanan</button>
                  <button type="button" onClick={() => setExportType('tahunan')} className={`py-2 text-[11px] md:text-xs font-bold rounded-xl border transition-all cursor-pointer ${exportType === 'tahunan' ? 'bg-[#00664b] text-white border-[#00664b]' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>Tahunan (Per Tahun)</button>
                </div>
              </div>

              {exportType === 'bulanan' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Bulan</label>
                  <select value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-[#00664b]">
                    {bulanList.map((bulan, i) => <option key={i} value={i}>{bulan}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Tahun</label>
                <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-[#00664b]">
                  {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-zinc-100">
              <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 text-xs md:text-sm text-zinc-600 font-semibold hover:bg-zinc-100 rounded-xl cursor-pointer transition-colors">Batal</button>
              <button onClick={exportLaporanOpname} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2 text-xs md:text-sm font-bold text-white bg-[#00664b] hover:bg-[#00553e] rounded-xl shadow-md cursor-pointer transition-colors"><Download size={15} /> Unduh Excel</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI MODERN */}
      {confirmModal.isOpen && ( 
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 md:p-6 text-center space-y-3">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base md:text-lg font-bold text-zinc-900">{confirmModal.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed px-2">{confirmModal.message}</p>
            </div>
            <div className="px-5 md:px-6 py-3.5 md:py-4 bg-zinc-50 border-t border-zinc-100 flex gap-3 justify-end">
              <button onClick={() => setConfirmModal({isOpen:false})} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer">Batal</button>
              <button onClick={confirmModal.onConfirm} className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00664b] hover:bg-[#00553e]'}`}>Ya, Lanjutkan</button>
            </div>
          </div>
        </div> 
      )}
      
      {isAddOpen && <TambahItem onClose={() => setIsAddOpen(false)} onSuccess={() => { setIsAddOpen(false); fetchItems(); }} />}
      {isEditOpen && <EditItem itemData={selectedItem} onClose={() => setIsEditOpen(false)} onSuccess={() => { setIsEditOpen(false); fetchItems(); }} />}
    </div>
  );
}