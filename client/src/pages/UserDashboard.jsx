import React, { useState, useEffect } from 'react';
import { PlusCircle, Hourglass, Package, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { supabase } from '../../supabaseClient'; 

export default function UserDashboard({ setCurrentView }) {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Chico Diar');
  const [lastRequest, setLastRequest] = useState({
    item: 'Belum ada permintaan',
    category: '-',
    date: '-',
    currentStep: 1,
    statusText: 'Belum ada aktivitas',
    steps: [
      { id: 1, name: 'Permintaan Diajukan' },
      { id: 2, name: 'Menunggu Persetujuan Manager' },
      { id: 3, name: 'Barang Siap Diambil' }
    ]
  });

  useEffect(() => {
    fetchUserDataAndLastRequest();
  }, []);

  const fetchUserDataAndLastRequest = async () => {
    setLoading(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const userEmail = activeUser?.email || activeUser?.mail || '';
      const fallbackName = activeUser?.namaLengkap || activeUser?.name || '';
      setUserName(fallbackName);

      if (!userEmail) {
        setLoading(false);
        return;
      }

      const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .select(`
          id,
          tanggal,
          status,
          keperluan,
          request_items (
            nama_barang,
            is_received
          )
        `)
        .eq('email_pemohon', userEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqError) throw reqError;

      if (reqData) {
        const rawStatus = (reqData.status || '').toLowerCase().trim();
        const items = reqData.request_items || [];
        const allItemsReceived = items.length > 0 && items.every(i => i.is_received === true);
        
        let step = 1;
        let badgeText = 'Dalam Proses';

        // 🌟 PEMETAAN TAHAPAN YANG PAS:
        if (rawStatus.includes('menunggu')) {
          // Jika baru diajukan atau sedang dalam antrean manager
          step = 2; // Berada di tahap Menunggu Persetujuan Manager
          badgeText = 'Menunggu Persetujuan Manager';
        } else if (rawStatus.includes('selesai') || rawStatus.includes('approved') || rawStatus.includes('completed')) {
          if (allItemsReceived) {
            step = 3; 
            badgeText = 'Barang Telah Diambil (Selesai)';
          } else {
            step = 3; // Tahap 3: Barang Siap Diambil (Setelah Manager ACC Final)
            badgeText = 'Barang Siap Diambil di Gudang';
          }
        } else if (rawStatus.includes('ditolak')) {
          step = 1;
          badgeText = 'Ditolak';
        }

        const firstItemName = items[0]?.nama_barang || 'Permintaan Logistik';
        const totalItemsCount = items.length;
        const displayItemName = totalItemsCount > 1 ? `${firstItemName} (+${totalItemsCount - 1} barang lainnya)` : firstItemName;

        setLastRequest({
          item: displayItemName,
          category: reqData.keperluan || 'Inventaris BSN',
          date: reqData.tanggal || '-',
          currentStep: step,
          statusText: badgeText,
          steps: [
            { id: 1, name: 'Permintaan Diajukan' },
            { id: 2, name: 'Menunggu Persetujuan Manager' },
            { id: 3, name: 'Barang Siap Diambil' }
          ]
        });
      }

    } catch (error) {
      console.error('Gagal mengambil data dashboard user:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Area Greetings */}
      <div className="bg-gradient-to-r from-[#00664b] to-[#004d38] p-6 text-white rounded-xl shadow-md border border-[#00553e] transition-all hover:scale-[1.005]">
        <h2 className="text-2xl font-bold">Halo, {userName} 👋</h2>
        <p className="text-green-100 text-sm mt-1">Mau ambil atau cek barang apa hari ini? Semangat ya!</p>
      </div>

      {/* 2. Quick Actions Menu */}
      <div>
        <h3 className="text-white font-semibold mb-3 text-sm tracking-wide uppercase">Aksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <button 
            onClick={() => setCurrentView && setCurrentView('ajukan-permintaan')}
            className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-md hover:border-[#00664b] hover:shadow-lg transition-all group text-left w-full hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-[#00664b] group-hover:bg-[#00664b] group-hover:text-white transition-colors rounded-lg">
                <PlusCircle size={24} />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Request Barang</p>
                <p className="text-xs text-zinc-500 mt-0.5">Buat formulir Permintaan baru</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-[#00664b] group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => setCurrentView && setCurrentView('riwayat-permintaan')}
            className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-md hover:border-blue-500 hover:shadow-lg transition-all group text-left w-full hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors rounded-lg">
                <Hourglass size={24} />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Progres Request</p>
                <p className="text-xs text-zinc-500 mt-0.5">Pantau persetujuan barang</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => setCurrentView && setCurrentView('aset')}
            className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-md hover:border-amber-500 hover:shadow-lg transition-all group text-left w-full hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors rounded-lg">
                <Package size={24} />
              </div>
              <div>
                <p className="font-semibold text-zinc-900">Lihat Inventory</p>
                <p className="text-xs text-zinc-500 mt-0.5">Cek ketersediaan semua barang</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
          </button>

        </div>
      </div>

      {/* 3. Lacak Proses Request Terakhir (Dari Database) */}
      <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-md">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">Permintaan Terakhir Anda</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Melihat history request permintaan secara real-time</p>
          </div>
          <span className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 font-medium rounded-md">
            {loading ? 'Memuat...' : lastRequest.date}
          </span>
        </div>

        {/* Info Barang */}
        <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {loading ? 'Memuat data permintaan...' : lastRequest.item}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
            lastRequest.currentStep === 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {loading ? '...' : lastRequest.statusText}
          </span>
        </div>

        {/* Visual Timeline Stepper */}
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 pt-2">
          {lastRequest.steps.map((step, index) => {
            const isCompleted = step.id < lastRequest.currentStep;
            const isCurrent = step.id === lastRequest.currentStep;

            return (
              <div key={step.id} className="flex md:flex-col items-center gap-3 md:gap-2 flex-1 w-full relative">
                
                {/* Garis Penghubung antar Step */}
                {index < lastRequest.steps.length - 1 && (
                  <div className="hidden md:block absolute top-4 left-[60%] w-[80%] h-0.5 bg-zinc-200 z-0">
                    <div 
                      className={`h-full bg-[#00664b] transition-all duration-500 ${
                        step.id < lastRequest.currentStep ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}

                {/* Indikator Ikon Lingkaran */}
                <div className="z-10 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="text-[#00664b] bg-white rounded-full" size={26} />
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full border-4 border-[#00664b] bg-white animate-pulse" />
                  ) : (
                    <Circle className="text-zinc-300 bg-white rounded-full" size={24} />
                  )}
                </div>

                {/* Teks Deskripsi Tahapan */}
                <div className="text-left md:text-center">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-[#00664b] font-semibold' : isCompleted ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {step.name}
                  </p>
                  {isCurrent && <p className="text-[10px] text-zinc-500 md:mt-0.5">Status saat ini</p>}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}