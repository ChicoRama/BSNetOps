import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, ArrowLeft, XCircle, AlertTriangle, RefreshCw, Download, Calendar, PackagePlus } from 'lucide-react';
import TambahItem from './TambahItem';
import EditItem from './EditItem';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

  // 🔥 State untuk Modal Export Bulan
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth()); 
  const [exportYear, setExportYear] = useState(new Date().getFullYear()); 

  // 🔥 State untuk Modal Barang Masuk (Restock)
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockData, setRestockData] = useState({ jumlah: '', keterangan: '' });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger', 
    onConfirm: () => {}
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

  // 🔥 FUNGSI BARU: Buka Modal Restock
  const handleRestockClick = (item) => {
    setSelectedItem(item);
    setRestockData({ jumlah: '', keterangan: '' });
    setIsRestockOpen(true);
  };

  // 🔥 FUNGSI BARU: Simpan Barang Masuk ke Database
  const submitRestock = async () => {
    if (!restockData.jumlah || restockData.jumlah <= 0) {
      toast.error("Jumlah barang masuk harus lebih dari 0");
      return;
    }
    const toastId = toast.loading('Memproses barang masuk...');
    try {
      // 1. Catat di tabel stock_in
      const { error: insertError } = await supabase.from('stock_in').insert([{
        kode_barang: selectedItem.id,
        jumlah_masuk: Number(restockData.jumlah),
        keterangan: restockData.keterangan || 'Restock'
      }]);
      if (insertError) throw insertError;

      // 2. Update stok di tabel items
      const stokBaru = Number(selectedItem.stock) + Number(restockData.jumlah);
      const { error: updateError } = await supabase.from('items').update({ stock: stokBaru }).eq('id', selectedItem.id);
      if (updateError) throw updateError;

      toast.success('Stok berhasil ditambahkan!', { id: toastId });
      setIsRestockOpen(false);
      fetchItems(); // Refresh data
    } catch (error) {
      toast.error(`Gagal: ${error.message}`, { id: toastId });
    }
  };

  const handleSoftDelete = async (item) => {
    try {
      const { count } = await supabase.from('request_items').select('*', { count: 'exact', head: true }).eq('kode_barang', item.id);
      if (count > 0) return toast.error(`TIDAK BISA DIHAPUS!\nBarang "${item.name}" sudah pernah di-request.`, { duration: 3000 });

      setConfirmModal({
        isOpen: true,
        title: 'Pindahkan ke Trash?',
        message: `Pindahkan "${item.name}" ke tempat sampah?`,
        type: 'warning',
        onConfirm: async () => {
          const timestamp = new Date().toISOString();
          await supabase.from('items').update({ deleted_at: timestamp }).eq('id', item.id);
          setItems(items.map(i => i.id === item.id ? { ...i, deleted_at: timestamp } : i));
          toast.success(`Berhasil dipindahkan ke Trash.`);
          setConfirmModal({ isOpen: false });
        }
      });
    } catch (error) {
      toast.error('Terjadi kesalahan saat arsip.');
    }
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
      isOpen: true,
      title: 'Hapus Permanen?',
      message: `PERINGATAN: "${item.name}" akan dihapus permanen!`,
      type: 'danger',
      onConfirm: async () => {
        await supabase.from('items').delete().eq('id', item.id);
        setItems(items.filter(i => i.id !== item.id));
        toast.success(`Dihapus permanen.`);
        setConfirmModal({ isOpen: false });
      }
    });
  };

  // 🔥 FUNGSI EXPORT LAPORAN OPNAME (VERSI EXCELJS - FULL DESIGN)
  const exportLaporanOpname = async () => {
    setIsExportModalOpen(false); 
    const toastId = toast.loading('Menyiapkan rekapitulasi stok yang cantik...');
    try {
      const startOfMonth = new Date(exportYear, exportMonth, 1).toISOString();
      const endOfMonth = new Date(exportYear, exportMonth + 1, 0, 23, 59, 59, 999).toISOString();
      const namaBulanPilih = new Date(exportYear, exportMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' });

      // Ambil barang yang diinput sebelum/sama dengan akhir bulan pilihan
      const validItems = items.filter(item => item.deleted_at === null && new Date(item.created_at) <= new Date(endOfMonth));

      // Jika kosong
      if (validItems.length === 0) {
        toast.error(`Data kosong di ${namaBulanPilih}.`, { id: toastId });
        return; 
      }

      // 1. Ambil Data Keluar (Request Items)
      const { data: reqData } = await supabase.from('request_items').select(`kode_barang, jumlah_diminta, jumlah_disetujui, requests (status)`).gte('created_at', startOfMonth).lte('created_at', endOfMonth);
      const validReqData = reqData || [];

      // 2. Ambil Data Masuk (Stock In)
      const { data: inData } = await supabase.from('stock_in').select('kode_barang, jumlah_masuk').gte('created_at', startOfMonth).lte('created_at', endOfMonth);
      const validInData = inData || [];

      // 3. Kalkulasi per Barang
      const opnameData = validItems.map((item, index) => {
        const totalKeluar = validReqData.filter(r => r.kode_barang === item.id).reduce((sum, curr) => {
          const status = (curr.requests?.status || '').toLowerCase();
          if (status.includes('setuju') || status.includes('selesai') || status.includes('approve')) {
             return sum + Number(curr.jumlah_disetujui ?? curr.jumlah_diminta ?? 0);
          }
          return sum; 
        }, 0);

        const totalMasuk = validInData.filter(r => r.kode_barang === item.id).reduce((sum, curr) => sum + Number(curr.jumlah_masuk || 0), 0);
        
        // Hitung Awal & Akhir
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

      // 4. Hitung Grand Total
      const totalBaris = opnameData.length;
      opnameData.push({
        no: '', kode: '', nama: 'TOTAL KESELURUHAN', kategori: '',
        awal: opnameData.reduce((s, i) => s + (Number(i.awal) || 0), 0),
        masuk: opnameData.reduce((s, i) => s + (Number(i.masuk) || 0), 0),
        keluar: opnameData.reduce((s, i) => s + (Number(i.keluar) || 0), 0),
        akhir: opnameData.reduce((s, i) => s + (Number(i.akhir) || 0), 0),
      });

      // ==========================================
      // 🎨 MULAI PROSES DESAIN MENGGUNAKAN EXCELJS
      // ==========================================
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Rekap ${namaBulanPilih}`);

      // Atur Kolom dan Lebarnya
      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Kode Barang', key: 'kode', width: 16 },
        { header: 'Nama Barang', key: 'nama', width: 32 },
        { header: 'Kategori', key: 'kategori', width: 22 },
        { header: 'Stok Awal', key: 'awal', width: 15 },
        { header: 'Barang Masuk', key: 'masuk', width: 16 },
        { header: 'Barang Keluar', key: 'keluar', width: 16 },
        { header: 'Stok Akhir', key: 'akhir', width: 15 }
      ];

      // Masukkan Data
      worksheet.addRows(opnameData);

      // Desain Header (Baris 1)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // Teks Putih
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00664B' } // Hijau Gelap BSNetOps
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      // Desain Seluruh Sel (Border dan Rata Tengah)
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          // Kasih garis tabel pinggir
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Semua rata tengah, kecuali kolom Nama Barang (Rata Kiri)
          if (rowNumber > 1) {
            if (colNumber === 3) {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
          }
        });
      });

      // Desain Khusus Baris "TOTAL KESELURUHAN" (Baris Paling Bawah)
      const lastRow = worksheet.getRow(totalBaris + 2); // +2 karena ada header
      lastRow.font = { bold: true };
      lastRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFDE047' } // Kuning Terang
      };

      // 5. Render & Download File
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Opname_${namaBulanPilih.replace(' ', '_')}.xlsx`);
      
      toast.success(`Laporan berhasil diunduh!`, { id: toastId });
    } catch (error) { 
      toast.error(`Gagal: ${error.message}`, { id: toastId, duration: 6000 }); 
    }
  };

  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const processedItems = items
    .filter(item => (showTrash ? item.deleted_at !== null : item.deleted_at === null))
    .filter(item => (categoryFilter === 'Semua' ? true : item.category === categoryFilter))
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : sortOrder === 'desc' ? b.name.localeCompare(a.name) : 0);

  const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tahunList = Array.from({length: new Date().getFullYear() - 2025}, (_, i) => new Date().getFullYear() - i); // 2026 ke atas

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {showTrash && <button onClick={() => setShowTrash(false)} className="p-2 bg-white border border-zinc-200 rounded-xl shadow-md text-[#00664b] hover:bg-emerald-50 transition-all cursor-pointer"><ArrowLeft size={18} /></button>}
          <div>
            <h2 className="text-xl font-bold text-white">Manajemen Stok & Inventaris</h2>
            <p className="text-xs text-white/80 mt-0.5">{showTrash ? 'Daftar arsip barang' : 'Daftar logistik dan aset operasional'}</p>
          </div>
        </div>

        {/* 🔥 Ubah flex-wrap menjadi flex-col dan atur posisinya (items-end atau items-start) */}
        <div className="flex flex-col items-end gap-3">
          
          {isAdmin && !showTrash && (
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-white text-[#00664b] border-2 border-[#00664b] rounded-xl text-sm font-semibold shadow-sm hover:bg-emerald-50 transition-all cursor-pointer">
              <Download size={16} /> Laporan Opname
            </button>
          )}

          <div className="flex items-center gap-3">
            {!showTrash && (
              <button onClick={() => setShowTrash(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer">
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
      </div>

      {/* Pencarian */}
      <div className="flex bg-white p-4 rounded-xl shadow-md border border-zinc-200/80">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari berdasarkan kode atau nama barang..." className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-colors"/>
        </div>
      </div>

      {/* Tabel */}
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
            {loading ? <tr><td colSpan={6} className="p-12 text-center text-zinc-400 font-medium">Memuat data...</td></tr> : 
             processedItems.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-zinc-400 font-medium">Tidak ditemukan data.</td></tr> : 
             processedItems.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50/40">
                <td className="p-4 font-mono font-bold text-zinc-900">{item.id}</td>
                <td className="p-4 font-semibold text-zinc-900">{item.name}</td>
                <td className="p-4 text-zinc-600">{item.category}</td>
                <td className="p-4 font-bold">{item.stock} Unit</td>
                <td className="p-4 text-zinc-600">{formatDate(item.date)}</td>
                {isAdmin && (
                  <td className="p-4 text-right space-x-2 flex justify-end gap-1">
                    {showTrash ? (
                      <>
                        <button onClick={() => handleRestore(item.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer"><RefreshCw size={14} /> Restore</button>
                        <button onClick={() => handleHardDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer"><XCircle size={14} /> Hapus Permanen</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditClick(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"><Edit3 size={18} /></button>
                        <button onClick={() => handleSoftDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={18} /></button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔥 MODAL RESTOCK (BARANG MASUK) */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-1">Barang Masuk (Restock)</h3>
            <p className="text-xs text-zinc-500 mb-4">Tambahkan stok untuk: <strong className="text-emerald-700">{selectedItem?.name}</strong></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Jumlah Masuk (Pcs)</label>
                <input type="number" min="1" value={restockData.jumlah} onChange={(e) => setRestockData({...restockData, jumlah: e.target.value})} className="w-full p-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" placeholder="Masukkan angka..."/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Keterangan (Opsional)</label>
                <input type="text" value={restockData.keterangan} onChange={(e) => setRestockData({...restockData, keterangan: e.target.value})} className="w-full p-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" placeholder="Misal: Beli dari Supplier A"/>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setIsRestockOpen(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer">Batal</button>
              <button onClick={submitRestock} className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl shadow-md cursor-pointer">Simpan Stok</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Bulan */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Calendar size={20} /></div>
              <div><h3 className="text-lg font-bold text-zinc-900">Pilih Periode Laporan</h3><p className="text-xs text-zinc-500">Rekapitulasi masuk & keluar.</p></div>
            </div>
            <div className="space-y-4 my-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Bulan</label>
                <select value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm">
                  {bulanList.map((bulan, i) => <option key={i} value={i}>{bulan}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tahun</label>
                <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm">
                  {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer">Batal</button>
              <button onClick={exportLaporanOpname} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#00664b] hover:bg-[#00553e] rounded-xl shadow-md cursor-pointer"><Download size={16} /> Unduh Excel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Delete/Add/Edit */}
      {confirmModal.isOpen && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200"><div className="bg-white w-full max-w-sm p-6 rounded-2xl animate-in zoom-in-95 duration-200"><h3 className="font-bold text-lg">{confirmModal.title}</h3><p className="text-sm mt-2">{confirmModal.message}</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => setConfirmModal({isOpen:false})} className="px-4 py-2 rounded-lg bg-zinc-200 cursor-pointer">Batal</button><button onClick={confirmModal.onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white cursor-pointer">Ya</button></div></div></div> )}
      {isAddOpen && <TambahItem onClose={() => setIsAddOpen(false)} onSuccess={() => { setIsAddOpen(false); fetchItems(); }} />}
      {isEditOpen && <EditItem itemData={selectedItem} onClose={() => setIsEditOpen(false)} onSuccess={() => { setIsEditOpen(false); fetchItems(); }} />}
    </div>
  );
}