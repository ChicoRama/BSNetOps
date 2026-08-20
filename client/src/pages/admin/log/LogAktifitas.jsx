import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, Package, Hash, Download, Calendar, ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';

export default function LogAktifitas() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [typeFilter, setTypeFilter] = useState('Semua Transaksi');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [periodMode, setPeriodMode] = useState('Semua Waktu'); 
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

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

  // 🔥 Fungsi Export ExcelJS
  const handleExport = async () => {
    if (filteredHistory.length === 0) {
      toast.error("Tidak ada data untuk di-export!");
      return;
    }

    const toastId = toast.loading('Menyiapkan file Excel...');

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Log Aktifitas BSN');

      // 1. Setup Kolom
      worksheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'ID Transaksi', key: 'id', width: 22 },
        { header: 'Tanggal', key: 'tanggal', width: 18 },
        { header: 'Pemohon/Aktor', key: 'pemohon', width: 25 },
        { header: 'Jenis', key: 'jenis', width: 12 },
        { header: 'Nama Barang', key: 'barang', width: 35 },
        { header: 'Jumlah', key: 'jumlah', width: 10 },
        { header: 'Unit Tujuan', key: 'unit', width: 22 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      // 2. Map & Masukkan Data
      const exportData = filteredHistory.map((item, index) => ({
        no: index + 1,
        id: item.id,
        tanggal: item.date,
        pemohon: item.requester,
        jenis: item.type,
        barang: item.itemName,
        jumlah: Number(item.qty) || 0,
        unit: item.type === 'Keluar' ? item.unit : 'Gudang Pusat',
        status: item.status
      }));

      worksheet.addRows(exportData);

      // 3. Desain Header (Warna Hijau BSN hanya sampai kolom terakhir)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00664B' } 
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 4. Desain Border dan Rata Kiri/Tengah untuk Isi Tabel
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          if (rowNumber > 1) {
            // Kolom 4 (Pemohon), 6 (Barang), 8 (Unit) dibuat rata kiri agar enak dibaca
            if ([4, 6, 8].includes(colNumber)) {
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            } else {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
          }
        });
      });

      // 5. Cetak File dan Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_Activity_Log_BSN.xlsx`);

      toast.success("Laporan berhasil diunduh!", { id: toastId });
    } catch (error) {
      toast.error(`Gagal: ${error.message}`, { id: toastId });
    }
  };

  const filteredHistory = history.filter(item => {
    if (typeFilter !== 'Semua Transaksi') {
      if (typeFilter === 'Masuk' && item.type !== 'Masuk') return false;
      if (typeFilter === 'Keluar' && item.type !== 'Keluar') return false;
    }

    if (statusFilter !== 'Semua Status') {
      if (item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

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
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 px-2 md:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Activity Log & Laporan</h2>
          <p className="text-xs text-white/80 mt-0.5">Pantau arus barang masuk/keluar dan rekapitulasi data logistik BSN</p>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-white text-[#00664b] border border-zinc-200 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-md cursor-pointer w-full md:w-auto"
        >
          <Download size={16} /> Export Laporan
        </button>
      </div>

      {/* FILTER BOX */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-md border border-zinc-200/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative flex items-center">
            <Search size={18} className="absolute left-3 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode atau nama barang..." 
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs md:text-sm focus:outline-none focus:border-[#00664b]"
            />
          </div>

          <div className="grid grid-cols-2 md:flex items-center gap-2">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-2.5 py-2 cursor-pointer font-medium text-xs md:text-sm focus:outline-none focus:border-[#00664b] w-full"
            >
              <option value="Semua Transaksi">Semua Transaksi</option>
              <option value="Masuk">Masuk</option>
              <option value="Keluar">Keluar</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-2.5 py-2 cursor-pointer font-medium text-xs md:text-sm focus:outline-none focus:border-[#00664b] w-full"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Filter Periode */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
          <span className="font-semibold flex items-center gap-1">
            <Calendar size={14} className="text-[#00664b]" /> Filter periode:
          </span>
          <div className="flex flex-wrap gap-2">
            <select 
              value={periodMode}
              onChange={(e) => {
                setPeriodMode(e.target.value);
                setSelectedMonth(''); 
                setSelectedYear('');  
              }}
              className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer focus:outline-none focus:border-[#00664b] text-xs"
            >
              <option value="Semua Waktu">Semua Waktu</option>
              <option value="Berdasarkan Bulan">Berdasarkan Bulan</option>
              <option value="Berdasarkan Tahun">Berdasarkan Tahun</option>
            </select>

            {periodMode === 'Berdasarkan Bulan' && (
              <select 
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  if (!selectedYear) setSelectedYear('2026'); 
                }}
                className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer focus:outline-none focus:border-[#00664b] text-xs"
              >
                <option value="" disabled>Pilih Bulan...</option>
                {bulanList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}

            {( (periodMode === 'Berdasarkan Bulan' && selectedMonth !== '') || periodMode === 'Berdasarkan Tahun' ) && (
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white border border-zinc-200 text-zinc-700 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer animate-in fade-in duration-200 focus:outline-none focus:border-[#00664b] text-xs"
              >
                <option value="" disabled>Pilih Tahun...</option>
                {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

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
          <div key={idx} className="relative mb-3 pl-12 md:pl-14 group">
            <div className="absolute left-0 top-6 md:top-1/2 -translate-y-1/2 z-10">
              <div className={`p-1.5 md:p-2 rounded-full ring-4 ring-white shadow-sm ${item.type === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {item.type === 'Masuk' ? <ArrowDownRight size={16} className="md:w-5 md:h-5" /> : <ArrowUpRight size={16} className="md:w-5 md:h-5" />}
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-3 md:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="space-y-1">
                  
                  <p className="text-xs md:text-sm text-zinc-700 leading-relaxed">
                    <span className="font-bold text-zinc-900">{item.requester}</span> 
                    {item.type === 'Masuk' ? (
                      ' mendaftarkan barang masuk/restock ke dalam inventaris berupa '
                    ) : (
                      <> mengajukan permohonan peminjaman inventaris untuk dikirim ke <span className="font-bold text-zinc-900 underline decoration-zinc-300 underline-offset-2">{item.unit}</span> berupa </>
                    )}
                    <span className="font-semibold text-[#00664b]">{item.qty} Unit {item.itemName}</span>.
                  </p>

                  <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-xs text-zinc-400 pt-1">
                    <span><Hash size={12} className="inline mr-1" />{item.id}</span>
                    <span><Clock size={12} className="inline mr-1" />{item.date}</span>
                    {item.type === 'Keluar' && (
                      <span className="text-[#00664b] font-medium"><MapPin size={12} className="inline mr-1" />{item.unit}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold border ${item.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <Package size={12} className="inline mr-1" /> {item.type}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold ${
                    item.status.toLowerCase() === 'approved' || item.status.toLowerCase() === 'selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    item.status.toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    <CheckCircle2 size={12} className="inline mr-1" /> {item.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}