import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, Package, Hash, Download, Calendar, ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function ActivityLog() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🔥 Default awal diset 'Semua Waktu' agar kosong/tidak langsung memfilter ke bulan tertentu
  const [typeFilter, setTypeFilter] = useState('Semua Transaksi');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [periodMode, setPeriodMode] = useState('Semua Waktu'); // 'Semua Waktu', 'Berdasarkan Bulan', 'Berdasarkan Tahun'
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // State untuk Modal Export Laporan Opname (Bulanan / Tahunan)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('bulanan'); 
  const [exportMonth, setExportMonth] = useState(new Date().getMonth()); 
  const [exportYear, setExportYear] = useState(new Date().getFullYear()); 

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('realtime-activity-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        () => fetchLogs(true) 
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logError) throw logError;

      const { data: reqData } = await supabase
        .from('requests')
        .select('id, unit');

      if (logData) {
        const formatted = logData.map(item => {
          const logType = (item.type || '').trim();
          const normalizedType = logType === 'Pengeluaran' ? 'Keluar' : logType;
          
          let targetUnit = '';
          if (normalizedType === 'Keluar') {
            const matchedRequest = reqData?.find(r => r.id === item.transaction_id);
            targetUnit = matchedRequest?.unit || item.unit || 'Kantor Cabang';
          }

          return {
            id: item.transaction_id,
            requester: item.requester,
            itemName: item.item_name,
            qty: item.qty,
            dateRaw: item.created_at ? new Date(item.created_at) : new Date(),
            date: item.date || new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            status: item.status || 'Approved',
            type: normalizedType,
            unit: targetUnit 
          };
        });
        setHistory(formatted);
      }
    } catch (error) {
      console.error('Gagal memuat log:', error.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // 🔥 1. FUNGSI EXPORT LAPORAN OPNAME (EXCELJS)
  const exportLaporanOpname = async () => {
    setIsExportModalOpen(false); 
    const toastId = toast.loading('Menyiapkan rekapitulasi stok...');
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

      const { data: validItems, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .is('deleted_at', null)
        .lte('created_at', endOfPeriod);

      if (itemsError) throw itemsError;

      if (!validItems || validItems.length === 0) {
        toast.error(`Data kosong di ${namaPeriode.replace('_', ' ')}.`, { id: toastId });
        return; 
      }

      const { data: reqData } = await supabase.from('request_items').select(`kode_barang, jumlah_diminta, jumlah_disetujui, requests (status)`).gte('created_at', startOfPeriod).lte('created_at', endOfPeriod);
      const validReqData = reqData || [];

      const { data: inData } = await supabase.from('stock_in').select('kode_barang, jumlah_masuk').gte('created_at', startOfPeriod).lte('created_at', endOfPeriod);
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

      const totalBaris = opnameData.length;
      opnameData.push({
        no: '', kode: '', nama: 'TOTAL KESELURUHAN', kategori: '',
        awal: opnameData.reduce((s, i) => s + (Number(i.awal) || 0), 0),
        masuk: opnameData.reduce((s, i) => s + (Number(i.masuk) || 0), 0),
        keluar: opnameData.reduce((s, i) => s + (Number(i.keluar) || 0), 0),
        akhir: opnameData.reduce((s, i) => s + (Number(i.akhir) || 0), 0),
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Rekap ${namaPeriode.replace('_', ' ')}`);

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

      worksheet.addRows(opnameData);

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00664B' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle', horizontal: colNumber === 3 ? 'left' : 'center' };
          }
        });
      });

      const lastRow = worksheet.getRow(totalBaris + 2); 
      lastRow.font = { bold: true };
      lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE047' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Opname_${namaPeriode}.xlsx`);
      
      toast.success(`Laporan ${namaPeriode.replace('_', ' ')} berhasil diunduh!`, { id: toastId });
    } catch (error) { 
      toast.error(`Gagal: ${error.message}`, { id: toastId, duration: 6000 }); 
    }
  };

  // 🔥 2. FUNGSI EXPORT LOG AKTIVITAS (XLSX)
  const handleExportLog = () => {
    const exportData = filteredHistory.map(item => ({
      "ID Transaksi": item.id,
      "Pemohon/Aktor": item.requester,
      "Jenis": item.type,
      "Barang": item.itemName,
      "Jumlah": item.qty,
      "Unit Tujuan": item.type === 'Keluar' ? item.unit : 'Gudang Pusat',
      "Tanggal": item.date,
      "Status": item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Logistik");
    XLSX.writeFile(workbook, "Laporan_Activity_Log_BSN.xlsx");
    toast.success("Log Aktivitas berhasil di-export!");
  };

  // 🔥 Filter Logika
  const filteredHistory = history.filter(item => {
    // 1. Filter Jenis Transaksi
    if (typeFilter !== 'Semua Transaksi') {
      if (typeFilter === 'Masuk' && item.type !== 'Masuk') return false;
      if (typeFilter === 'Keluar' && item.type !== 'Keluar') return false;
    }

    // 2. Filter Status
    if (statusFilter !== 'Semua Status') {
      if (item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // 3. Filter Periode
    if (periodMode === 'Berdasarkan Bulan') {
      if (selectedMonth) {
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const itemMonthName = monthNames[item.dateRaw.getMonth()];
        if (itemMonthName !== selectedMonth) return false;
      }
      if (selectedYear) {
        const itemYearStr = item.dateRaw.getFullYear().toString();
        if (itemYearStr !== selectedYear) return false;
      }
    } else if (periodMode === 'Berdasarkan Tahun') {
      if (selectedYear) {
        const itemYearStr = item.dateRaw.getFullYear().toString();
        if (itemYearStr !== selectedYear) return false;
      }
    }

    // 4. Filter Pencarian Teks
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      item.requester.toLowerCase().includes(query) ||
      item.itemName.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      (item.unit && item.unit.toLowerCase().includes(query));

    return matchSearch;
  });

  const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tahunList = ["2024", "2025", "2026", "2027"];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Activity Log & Laporan</h2>
          <p className="text-xs text-white/80 mt-0.5">Pantau arus barang masuk/keluar dan rekapitulasi data logistik BSN</p>
        </div>

        {/* 2 TOMBOL EXPORT BERDAMPINGAN */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white text-[#00664b] border-2 border-[#00664b] hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold shadow-md cursor-pointer"
          >
            <Download size={16} /> Laporan Opname
          </button>

          <button 
            onClick={handleExportLog}
            className="flex items-center justify-center gap-2 bg-white text-[#00664b] border-2 border-[#00664b] hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold shadow-md cursor-pointer"
          >
            <Download size={16} /> Export Laporan
          </button>
        </div>
      </div>

      {/* FILTER BOX */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-zinc-200/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative flex items-center">
            <Search size={18} className="absolute left-3 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan kode atau nama barang..." 
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-3 py-2 cursor-pointer font-medium text-sm focus:outline-none focus:border-[#00664b]"
            >
              <option value="Semua Transaksi">Semua Transaksi</option>
              <option value="Masuk">Masuk</option>
              <option value="Keluar">Keluar</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-3 py-2 cursor-pointer font-medium text-sm focus:outline-none focus:border-[#00664b]"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Baris Filter Periode */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
          <span className="font-semibold flex items-center gap-1">
            <Calendar size={14} className="text-[#00664b]" /> Filter periode:
          </span>
          <select 
            value={periodMode}
            onChange={(e) => {
              setPeriodMode(e.target.value);
              setSelectedMonth(''); // Reset bulan saat mode periode diubah
              setSelectedYear('');  // Reset tahun saat mode periode diubah
            }}
            className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-3 py-1.5 font-medium cursor-pointer focus:outline-none focus:border-[#00664b]"
          >
            <option value="Semua Waktu">Semua Waktu</option>
            <option value="Berdasarkan Bulan">Berdasarkan Bulan</option>
            <option value="Berdasarkan Tahun">Berdasarkan Tahun</option>
          </select>

          {/* Muncul Dropdown Bulan jika 'Berdasarkan Bulan' dipilih */}
          {periodMode === 'Berdasarkan Bulan' && (
            <select 
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (!selectedYear) setSelectedYear('2026'); // Auto set tahun default kalau belum dipilih
              }}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-3 py-1.5 font-medium cursor-pointer focus:outline-none focus:border-[#00664b]"
            >
              <option value="" disabled>Pilih Bulan...</option>
              {bulanList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}

          {/* Muncul Kolom Tahun HANYA JIKA Bulan sudah dipilih ATAU Mode 'Berdasarkan Tahun' aktif */}
          {( (periodMode === 'Berdasarkan Bulan' && selectedMonth !== '') || periodMode === 'Berdasarkan Tahun' ) && (
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-3 py-1.5 font-medium cursor-pointer animate-in fade-in duration-200 focus:outline-none focus:border-[#00664b]"
            >
              <option value="" disabled>Pilih Tahun...</option>
              {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* DAFTAR LOG AKTIVITAS */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-xl shadow-sm border border-zinc-200">
          Memuat data log...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-xl shadow-sm border border-zinc-200">
          Tidak ada riwayat aktivitas yang cocok dengan filter.
        </div>
      ) : (
        filteredHistory.map((item, idx) => (
          <div key={idx} className="relative mb-4 pl-14 group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <div className={`p-2 rounded-full ring-4 ring-white shadow-sm ${item.type === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {item.type === 'Masuk' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-1">
                  
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    <span className="font-bold text-zinc-900">{item.requester}</span> 
                    {item.type === 'Masuk' ? (
                      ' mendaftarkan barang masuk/restock ke dalam inventaris berupa '
                    ) : (
                      <> mengajukan permohonan peminjaman inventaris untuk dikirim ke <span className="font-bold text-zinc-900 underline decoration-zinc-300 underline-offset-2">{item.unit}</span> berupa </>
                    )}
                    <span className="font-semibold text-[#00664b]">{item.qty} Unit {item.itemName}</span>.
                  </p>

                  <div className="flex gap-4 text-xs text-zinc-400 pt-1">
                    <span><Hash size={12} className="inline mr-1" />{item.id}</span>
                    <span><Clock size={12} className="inline mr-1" />{item.date}</span>
                    {item.type === 'Keluar' && (
                      <span className="text-[#00664b] font-medium"><MapPin size={12} className="inline mr-1" />{item.unit}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${item.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <Package size={14} className="inline mr-1" /> {item.type}
                  </span>
                  <span className={`px-3 py-1.5 rounded-md text-xs font-bold ${
                    item.status.toLowerCase() === 'approved' || item.status.toLowerCase() === 'selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    item.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <CheckCircle2 size={14} className="inline mr-1" /> {item.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {/* MODAL PILIH PERIODE EXPORT (BULANAN / TAHUNAN) UNTUK LAPORAN OPNAME */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Calendar size={20} /></div>
              <div><h3 className="text-lg font-bold text-zinc-900">Pilih Periode Laporan</h3><p className="text-xs text-zinc-500">Rekapitulasi masuk & keluar.</p></div>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Jenis Rekap</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setExportType('bulanan')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${exportType === 'bulanan' ? 'bg-[#00664b] text-white border-[#00664b]' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}
                  >
                    Bulanan
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExportType('tahunan')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${exportType === 'tahunan' ? 'bg-[#00664b] text-white border-[#00664b]' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'}`}
                  >
                    Tahunan (Per Tahun)
                  </button>
                </div>
              </div>

              {exportType === 'bulanan' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Bulan</label>
                  <select value={exportMonth} onChange={(e) => setExportMonth(Number(e.target.value))} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]">
                    {bulanList.map((bulan, i) => <option key={i} value={i}>{bulan}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tahun</label>
                <select value={exportYear} onChange={(e) => setExportYear(Number(e.target.value))} className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]">
                  {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer">Batal</button>
              <button onClick={exportLaporanOpname} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#00664b] hover:bg-[#00553e] rounded-xl shadow-md cursor-pointer"><Download size={16} /> Unduh Excel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}