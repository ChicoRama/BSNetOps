import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

const COLORS = ['#00664b', '#3B82F6', '#FFBF00', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16'];

export default function AdminDashboard({ role = 'admin' }) {
  const [loading, setLoading] = useState(true);
  const [totalBarang, setTotalBarang] = useState(0);
  const [barangMasuk, setBarangMasuk] = useState(0);
  const [barangKeluar, setBarangKeluar] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // ==========================================
  // 🔥 SUPABASE REALTIME DI-AKTIFKAN
  // ==========================================
  useEffect(() => {
    fetchDashboardData();

    const dashboardChannel = supabase
      .channel('realtime-admin-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' }, 
        (payload) => {
          console.log('Realtime Update Diterima di Dashboard:', payload);
          fetchDashboardData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);

    try {
      // 🔥 1. Ambil Kategori Aktif dulu biar kategori baru terdaftar walau stok 0
      const { data: catData } = await supabase
        .from('categories')
        .select('name')
        .is('deleted_at', null);

      // 🔥 2. Ambil data dari tabel 'items'
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .is('deleted_at', null);

      if (itemsError) throw itemsError;

      let totalStock = 0;
      const categoryMap = {};

      // Inisialisasi semua kategori dengan nilai 0
      if (catData) {
        catData.forEach(c => {
          categoryMap[c.name] = 0;
        });
      }

      // Mulai hitung stok dari items
      if (itemsData) {
        itemsData.forEach(item => {
          const qty = parseInt(item.stock) || 0;
          totalStock += qty;

          const cat = item.category && item.category !== '-' ? item.category : 'Lainnya';
          
          // Kalau ada kategori dari barang lama yang nggak kedaftar, tambahin
          if (categoryMap[cat] === undefined) {
            categoryMap[cat] = 0;
          }
          categoryMap[cat] += qty;
        });

        setTotalBarang(totalStock);

        const formattedCategoryData = Object.keys(categoryMap).map(catName => ({
          name: catName,
          value: categoryMap[catName]
        }));
        setCategoryData(formattedCategoryData);
      }

      // 🔥 3. Ambil data aktivitas
      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logError) throw logError;

      // 🔥 4. Ambil data requests untuk NAMA UNIT
      const { data: reqData } = await supabase
        .from('requests')
        .select('id, unit');

      let totalKeluarCount = 0;
      if (logData) {
        const formattedLogs = logData.map(log => {
          const logType = (log.type || '').trim();
          
          if (logType === 'Keluar' || logType === 'Pengeluaran') {
            totalKeluarCount += (parseInt(log.qty) || 0);
          }
          
          const displayDate = log.date || (log.created_at ? new Date(log.created_at).toLocaleDateString('id-ID') : '-');

          let unitDisplay = 'Gudang Pusat';
          if (logType === 'Masuk') {
            unitDisplay = 'Gudang Pusat';
          } else {
            const matchedRequest = reqData?.find(r => r.id === log.transaction_id);
            unitDisplay = matchedRequest?.unit || log.unit || 'Kantor Cabang';
          }

          return {
            id: log.transaction_id || log.id,
            item: log.item_name,
            unit: unitDisplay, 
            type: logType === 'Pengeluaran' ? 'Keluar' : logType,
            date: displayDate
          };
        });

        setBarangKeluar(totalKeluarCount);
        setBarangMasuk(totalStock + totalKeluarCount);
        setActivityLogs(formattedLogs.slice(0, 5));
      }

    } catch (error) {
      console.error('Gagal memuat data AdminDashboard:', error.message);
      if (!isBackground) toast.error('Gagal memuat data dashboard!');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white capitalize">Admin Overview</h2>
          <p className="text-xs text-white mt-0.5">Mode Kontrol Penuh Akun Inventaris Gudang</p>
        </div>
      </div>

      {/* Statistik Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md transition-all hover:scale-[1.01]">
          <h3 className="text-zinc-500 text-sm font-medium">Total Barang Gudang</h3>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{loading ? '...' : totalBarang.toLocaleString('id-ID')}</p>
        </div>
        
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md transition-all hover:scale-[1.01]">
          <h3 className="text-zinc-500 text-sm font-medium">Total Stok Masuk</h3>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{loading ? '...' : barangMasuk.toLocaleString('id-ID')}</p>
        </div>
        
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md transition-all hover:scale-[1.01]">
          <h3 className="text-zinc-500 text-sm font-medium">Barang Keluar</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{loading ? '...' : barangKeluar.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Distribusi */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Distribusi Kategori Aset</h2>
          <div className="h-64 w-full pt-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">Memuat grafik...</div>
            ) : categoryData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">Belum ada data kategori.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <Pie data={categoryData} startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    formatter={(value, entry) => {
                      const { payload } = entry;
                      return (
                        <span className="text-zinc-600 font-medium text-sm">
                          {value}: <span className="font-semibold text-zinc-800">{payload.value} Unit</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tabel Aktivitas Terakhir */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md overflow-hidden">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Aktivitas Terakhir</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-zinc-500 border-b bg-zinc-50/50 text-xs uppercase font-semibold">
                  <th className="pb-3 pt-2 px-2">Barang</th>
                  <th className="pb-3 pt-2 px-2">Unit</th>
                  <th className="pb-3 pt-2 px-2">Status</th>
                  <th className="pb-3 pt-2 px-2">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-xs text-zinc-400">Memuat aktivitas...</td></tr>
                ) : activityLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-xs text-zinc-400">Belum ada aktivitas tercatat.</td></tr>
                ) : (
                  activityLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-zinc-50/40 transition-colors">
                      <td className="py-4 px-2 font-medium text-zinc-900 truncate max-w-[150px]">{log.item}</td>
                      <td className="py-4 px-2 font-bold text-[#00664b]">{log.unit}</td> 
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${log.type === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-zinc-500 text-xs">{log.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}