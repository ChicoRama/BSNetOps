import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { ClipboardList, AlertTriangle, CheckSquare, ShieldAlert, Building2, Package } from 'lucide-react';
import { supabase } from '../../supabaseClient'; 
import toast from 'react-hot-toast';

const CustomLegend = (props) => {
  const { payload } = props;

  return (
    <div className="flex items-center justify-center gap-6 mb-6 select-none">
      {payload.map((entry, index) => {
        const isKeluar = entry.dataKey === 'Keluar';
        const baseColor = isKeluar ? '#58a27d' : '#3b82f6';
        const borderColor = isKeluar ? 'rgba(88, 162, 125, 0.4)' : 'rgba(59, 130, 246, 0.4)';

        return (
          <div key={`item-${index}`} className="flex items-center gap-3 text-sm font-semibold">
            <div 
              className="w-6 h-6 rounded-[6px] border flex items-center justify-center p-[2px] shrink-0"
              style={{ borderColor: borderColor }}
            >
              <div 
                className="w-4 h-4 rounded-[4px]"
                style={{ backgroundColor: baseColor }}
              />
            </div>
            <span style={{ color: isKeluar ? '#1f2937' : '#1e3a8a' }}>
              {entry.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dimintaVal = payload.find(p => p.dataKey === 'Diminta')?.value || 0;
    const keluarVal = payload.find(p => p.dataKey === 'Keluar')?.value || 0;

    return (
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.15)] p-4 w-64 text-zinc-800 opacity-100 flex flex-col select-none pointer-events-none">
        
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-100 w-full">
          <div className="w-7 h-7 rounded-lg bg-[#004d38] text-white flex items-center justify-center shadow-sm shrink-0">
            <Building2 size={15} />
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-900 truncate">{label}</span>
        </div>

        <div className="mt-3 space-y-2.5 text-xs font-semibold w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
              <span className="text-zinc-600 font-medium">Barang Diminta</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100/50 rounded-md shrink-0">
              <span className="font-bold">{dimintaVal}</span>
              <ClipboardList size={11} className="opacity-80" />
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#58a27d' }}></span>
              <span className="text-zinc-600 font-medium">Telah Didistribusi</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-[#58a27d] border border-emerald-100/50 rounded-md shrink-0">
              <span className="font-bold">{keluarVal}</span>
              <Package size={11} className="opacity-80" />
            </div>
          </div>
        </div>

      </div>
    );
  }
  return null;
};

export default function ManagerDashboard({ role = 'manager', setCurrentView}) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    antrean: 0,
    barangKeluar: 0,
    restock: 0
  });

  // ==========================================
  // 🔥 SUPABASE REALTIME DI-AKTIFKAN
  // ==========================================
  useEffect(() => {
    // 1. Tarik data pertama kali halaman dibuka
    fetchDashboardData();

    // 2. Subscribe ke Supabase Realtime (Memantau semua perubahan di database)
    const dashboardChannel = supabase
      .channel('realtime-manager-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' }, // Memantau semua tabel (requests & items)
        (payload) => {
          console.log('Realtime Update Diterima di Manager Dashboard:', payload);
          // Tarik ulang data secara diam-diam (isBackground = true)
          fetchDashboardData(true);
        }
      )
      .subscribe();

    // 3. Bersihkan channel saat komponen ditutup
    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  // 🔥 Parameter isBackground ditambahkan
  const fetchDashboardData = async (isBackground = false) => {
    // Hanya tampilkan loading screen jika bukan background refresh
    if (!isBackground) setLoading(true);

    try {
      // 1. Ambil data Requests
      const { data: requestsData, error: reqError } = await supabase
        .from('requests')
        .select(`
          id,
          unit,
          status,
          request_items (
            jumlah_diminta,
            jumlah_disetujui
          )
        `);

      if (reqError) throw reqError;

      // 2. 🔥 PERBAIKAN: Hanya panggil kolom 'stock' yang terbukti ada di tabel items-mu
      const { data: itemsData, error: itemError } = await supabase
        .from('items')
        .select('id, stock');

      if (itemError) throw itemError;

      let antreanCount = 0;
      let totalKeluar = 0;
      let criticalStockCount = 0;

      const unitMap = {
        'KC Semarang': { Diminta: 0, Keluar: 0 },
        'KCP Majapahit': { Diminta: 0, Keluar: 0 },
        'KCP Ngaliyan': { Diminta: 0, Keluar: 0 },
        'KCP Ungaran': { Diminta: 0, Keluar: 0 },
        'KCP Kendal': { Diminta: 0, Keluar: 0 },
        'KCP Kudus': { Diminta: 0, Keluar: 0 },
        'KCP Magelang': { Diminta: 0, Keluar: 0 },
      };

      requestsData?.forEach(req => {
        const dbStatus = (req.status || '').toLowerCase().trim();
        
        // Cek secara spesifik untuk Menunggu Manager (sama persis dengan logic di menu Approval)
        if (dbStatus === 'menunggu manager') {
          antreanCount++;
        }

        if (req.unit && !unitMap[req.unit]) {
          unitMap[req.unit] = { Diminta: 0, Keluar: 0 };
        }

        req.request_items?.forEach(item => {
          const diminta = item.jumlah_diminta || 0;
          const disetujui = item.jumlah_disetujui || 0;

          if (req.unit) {
            unitMap[req.unit].Diminta += diminta;
            if (dbStatus.includes('selesai') || dbStatus.includes('completed') || dbStatus.includes('approved')) {
               unitMap[req.unit].Keluar += disetujui;
            }
          }

          if (dbStatus.includes('selesai') || dbStatus.includes('completed') || dbStatus.includes('approved')) {
            totalKeluar += disetujui;
          }
        });
      });

      const formattedChartData = Object.keys(unitMap).map(key => ({
        name: key,
        Diminta: unitMap[key].Diminta,
        Keluar: unitMap[key].Keluar
      }));

      // Menghitung jumlah kategori yang stoknya menipis
      itemsData?.forEach(item => {
        const currentStock = item.stock || 0;
        if (currentStock < 10) {
          criticalStockCount++;
        }
      });

      setStats({
        antrean: antreanCount,
        barangKeluar: totalKeluar,
        restock: criticalStockCount
      });
      setChartData(formattedChartData);

    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error.message);
      // Hindari munculin toast error kalau ini background proses
      if (!isBackground) toast.error('Gagal memuat data dashboard dari database!');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800">
      
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Manager Oversight Dashboard</h2>
        <p className="text-xs text-white font-normal mt-0.5">Ringkasan Analitik Distribusi Unit dan Status Urgensi Inventaris Global</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div
        onClick={() => setCurrentView('approval-request')}
        className="bg-white p-6 border border-zinc-200/80 rounded-2xl shadow-sm border-l-4 border-l-amber-500 transition-all hover:scale-[1.01] cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Antrean Approval</h3>
              <p className="text-3xl font-bold text-zinc-900 mt-2">
                {loading ? '...' : stats.antrean} <span className="text-sm font-medium text-zinc-500">Tiket</span>
              </p>
              <p className="text-[11px] text-amber-600 mt-2 font-medium">Buka menu Approval Request untuk memproses</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><ClipboardList size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-6 border border-zinc-200/80 rounded-2xl shadow-sm border-l-4 border-l-[#00664b] transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Barang Keluar</h3>
              <p className="text-3xl font-bold text-zinc-900 mt-2">
                {loading ? '...' : stats.barangKeluar} <span className="text-sm font-medium text-zinc-500">Unit</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-2">Total barang yang telah disetujui & didistribusikan</p>
            </div>
            <div className="p-2.5 bg-green-50 text-[#00664b] rounded-lg"><CheckSquare size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-6 border border-zinc-200/80 rounded-2xl shadow-sm border-l-4 border-l-red-500 transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Restock Segera</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {loading ? '...' : stats.restock} <span className="text-sm font-medium text-red-400">Kategori</span>
              </p>
              <p className="text-[11px] text-red-500 mt-2 font-medium">Stok kritis di bawah batas minimum ({"<"} 10)</p>
            </div>
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 border border-zinc-200/80 rounded-2xl shadow-sm">
        <div className="mb-4">
          <h3 className="font-bold text-zinc-900 text-base">Statistik Permintaan vs Distribusi per Unit</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Memantau rasio perbandingan jumlah barang yang diminta dengan barang yang telah didistribusikan</p>
        </div>
        <div className="h-90 w-full pt-4 min-h-[350px]">
          {loading ? (
            <div className="w-full h-full flex justify-center items-center text-zinc-400 text-sm">
              Memuat grafik data analitik...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} dy={5} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                
                <Legend verticalAlign="top" content={<CustomLegend />} />
                
                <Bar dataKey="Diminta" fill="#3b82f6" name="Barang Diminta" radius={[12, 12, 0, 0]}>
                  <LabelList dataKey="Diminta" position="top" fontSize={15} fill="#3b82f6" fontWeight="bold" />
                </Bar>
                
                <Bar dataKey="Keluar" fill="#58a27d" name="Barang Keluar" radius={[12, 12, 0, 0]}>
                  <LabelList dataKey="Keluar" position="top" fontSize={15} fill="#58a27d" fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 bg-zinc-200/60 text-zinc-600 rounded-md shrink-0"><ShieldAlert size={18} /></div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          <strong>Mode Akun: Manager (Read-Only Data Analitik).</strong> Anda tidak memiliki hak akses untuk memanipulasi, menambah, atau menghapus entri barang fisik di dalam sistem inventaris gudang. Otoritas penuh mutasi aset dipegang oleh Admin Gudang.
        </p>
      </div>

    </div>
  );
}