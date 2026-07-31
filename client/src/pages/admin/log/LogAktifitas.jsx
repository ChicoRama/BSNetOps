import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, Activity, Package, Hash, Download, ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../supabaseClient';

export default function LogAktifitas() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Semua');

  useEffect(() => {
    fetchLogs();

    // 🔥 Realtime: dengarkan perubahan di tabel activity_logs
    const channel = supabase
      .channel('realtime-activity-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        () => fetchLogs(true) // background refresh, tanpa spinner loading
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔥 Parameter isBackground ditambahkan agar refresh dari realtime tidak menampilkan loading state
  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // 1. Ambil data dari tabel activity_logs
      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logError) throw logError;

      // 🔥 2. Ambil data dari tabel requests untuk mendapatkan info Unit Cabang yang akurat
      const { data: reqData } = await supabase
        .from('requests')
        .select('id, unit');

      if (logData) {
        const formatted = logData.map(item => {
          const logType = (item.type || '').trim();
          const normalizedType = logType === 'Pengeluaran' ? 'Keluar' : logType;
          
          // 🔥 3. Cari Unit Cabang berdasarkan ID Transaksi
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
            date: item.date || new Date(item.created_at).toLocaleDateString('id-ID'),
            status: item.status,
            type: normalizedType,
            unit: targetUnit // Simpan data unit ke dalam state
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

  const filteredHistory = history
    .filter(item => (typeFilter === 'Semua' ? true : item.type === typeFilter))
    .filter(item =>
      item.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.unit && item.unit.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const handleExport = () => {
    // Mempercantik data sebelum diexport ke Excel agar ada kolom Unit Tujuan
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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Activity Log & Laporan</h2>
            <p className="text-xs text-white/80 mt-0.5">Arsip riwayat transaksi barang masuk dan keluar gudang</p>
          </div>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-white text-[#00664b] border border-zinc-200 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer"
        >
          <Download size={16} /> Export Laporan
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md border border-zinc-200/80 flex gap-4">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID, pemohon, nama barang, atau unit cabang..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]"
          />
        </div>
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 text-sm text-zinc-700 rounded-lg px-3 py-2 cursor-pointer font-medium"
        >
          <option value="Semua">Semua Transaksi</option>
          <option value="Masuk">Barang Masuk</option>
          <option value="Keluar">Barang Keluar</option>
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-xl shadow-sm border border-zinc-200">
          Memuat data log...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-400 bg-white rounded-xl shadow-sm border border-zinc-200">
          Belum ada riwayat aktivitas tercatat di database.
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
                  
                  {/* 🔥 PERUBAHAN KALIMAT DINAMIS MENGGUNAKAN DATA UNIT */}
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    <span className="font-bold text-zinc-900">{item.requester}</span> 
                    {item.type === 'Masuk' ? (
                      ' menambahkan pasokan barang ke inventaris gudang pusat berupa '
                    ) : (
                      <> melakukan request barang <span className="font-bold text-zinc-900 underline decoration-zinc-300 underline-offset-2"></span> berupa </>
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
                  <span className="px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={14} className="inline mr-1" /> {item.status}
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