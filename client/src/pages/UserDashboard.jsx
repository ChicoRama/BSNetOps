import React, { useState, useEffect } from 'react';
import { PlusCircle, Hourglass, Package, CheckCircle2, Circle, ArrowRight, XCircle } from 'lucide-react';
import { supabase } from '../../supabaseClient'; 
import toast from 'react-hot-toast';

export default function UserDashboard({ setCurrentView }) {
  const [lastRequest, setLastRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    fetchUserDataAndLastRequest();

    const dashboardChannel = supabase
      .channel('realtime-user-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          console.log('Realtime Update Diterima di User Dashboard:', payload);
          fetchUserDataAndLastRequest(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, []);

  const fetchUserDataAndLastRequest = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);

    try {
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const userEmail = activeUser?.email || activeUser?.mail || '';
      
      const fullName = activeUser?.namaLengkap || activeUser?.name || 'User';
      const firstName = fullName.split(' ')[0];
      setUserName(firstName);

      if (!userEmail) {
        if (!isBackground) setIsLoading(false);
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
            nama_barang
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
        
        let step = 1;
        let statusText = 'Dalam Proses (Pending)';

        // 🔥 LOGIKA STEPPER BARU: Kalau Manager ACC, otomatis langsung Selesai (Step 3)
        if (rawStatus.includes('ditolak')) {
          step = -1;
          statusText = 'Ditolak';
        } else if (rawStatus.includes('selesai') || rawStatus.includes('approved') || rawStatus.includes('completed')) {
          step = 3;
          statusText = 'Selesai';
        } else if (rawStatus.includes('menunggu manager') || rawStatus.includes('diteruskan')) {
          step = 2;
          statusText = 'Diteruskan Ke Manager';
        }

        const firstItemName = items[0]?.nama_barang || 'Barang';
        const sisaBarang = items.length - 1;
        
        let barangValue = firstItemName;
        if (sisaBarang > 0) {
          barangValue += `, +${sisaBarang} lainnya`;
        }

        // Format tanggal jadi "23 Agustus 2026"
        const rawDate = new Date(reqData.tanggal || Date.now());
        const tglFormat = rawDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

        setLastRequest({
          id: reqData.id,
          barangValue: barangValue,
          category: reqData.keperluan || 'Inventaris Umum',
          statusText: statusText,
          date: tglFormat,
          currentStep: step,
          steps: [
            { id: 1, name: 'Permintaan Diajukan', sub: 'Menunggu Validasi Admin' },
            { id: 2, name: 'Persetujuan Manajer', sub: 'Proses Review Manager' },
            { id: 3, name: 'Barang Selesai', sub: 'Disetujui Manager' } // 🔥 Ubah deskripsi step 3
          ]
        });
      } else {
        setLastRequest(null);
      }

    } catch (error) {
      console.error('Gagal mengambil data dashboard user:', error.message);
      if (!isBackground) toast.error('Gagal memuat data dashboard!');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const renderStatusBadge = (step, statusText) => {
    if (step === -1) {
      return <span className="text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-md">Ditolak</span>;
    }
    if (step === 3) {
      // 🔥 Ubah label lencana kalau Step 3
      return <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md">Disetujui / Selesai</span>;
    }
    if (step === 2) {
      return <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md">Diteruskan Ke Manager</span>;
    }
    return <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">Dalam Proses (Pending)</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Sapaan */}
      <div className="bg-gradient-to-r from-[#00664b] to-[#004d38] p-6 text-white rounded-xl shadow-md border border-[#00553e] transition-all hover:scale-[1.005]">
        <h2 className="text-2xl font-bold">
          Halo, {userName} 👋
        </h2>
        <p className="text-green-100 text-sm mt-1">Mau ambil atau cek inventaris barang apa hari ini? Semangat ya!</p>
      </div>

      {/* 2. Menu Aksi Cepat */}
      <div>
        <h3 className="text-zinc-500 font-semibold mb-3 text-sm tracking-wide uppercase">Aksi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <button onClick={() => setCurrentView && setCurrentView('ajukan-permintaan')} className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-md hover:border-[#00664b] hover:shadow-lg transition-all group text-left w-full hover:scale-[1.01] cursor-pointer">
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
          
          <button onClick={() => setCurrentView && setCurrentView('riwayat-permintaan')} className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-md hover:border-blue-500 hover:shadow-lg transition-all group text-left w-full hover:scale-[1.01] cursor-pointer">
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

          <button onClick={() => setCurrentView && setCurrentView('aset')} className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-md hover:border-amber-500 hover:shadow-lg transition-all group text-left w-full hover:scale-[1.01] cursor-pointer">
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

      {/* 3. Permintaan Terakhir */}
      <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-md">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">Permintaan Terakhir Anda</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Memonitor logistik barang secara real-time</p>
          </div>
          {lastRequest && (
            <span className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 font-medium rounded-md">
              {lastRequest.date}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-center text-zinc-500 py-6">⏳ Memuat data...</p>
        ) : lastRequest ? (
          <>
            {/* Box Detail Item */}
            <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg flex justify-between items-start md:items-center gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[17px] font-bold text-zinc-900 leading-tight tracking-tight mb-1 truncate">{lastRequest.id}</p>
                
                <p className="text-[14px] flex items-baseline min-w-0">
                  <span className="text-zinc-500 shrink-0 mr-1.5">Barang :</span>
                  <span className="font-medium text-zinc-700 truncate block" title={lastRequest.barangValue}>
                    {lastRequest.barangValue}
                  </span>
                </p>
                
                <p className="text-[14px] flex items-baseline min-w-0">
                  <span className="text-zinc-500 shrink-0 mr-1.5">Kategori :</span>
                  <span className="font-medium text-zinc-700 truncate block" title={lastRequest.category}>
                    {lastRequest.category}
                  </span>
                </p>
              </div>
              <div className="mt-2 md:mt-0 shrink-0">
                {renderStatusBadge(lastRequest.currentStep, lastRequest.statusText)}
              </div>
            </div>

            {/* Jika Ditolak */}
            {lastRequest.currentStep === -1 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-600 text-sm flex items-center justify-center gap-2">
                <XCircle size={18} />
                Permintaan ini telah ditolak oleh Admin/Manager. Silakan hubungi admin atau ajukan ulang.
              </div>
            ) : (
              /* Visual Timeline Stepper */
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 pt-2">
                
                {/* Latar Belakang Garis Abu-abu (Biar Rapi) */}
                <div className="hidden md:block absolute left-10 right-10 top-3 h-[2px] bg-zinc-200 -z-10" />

                {lastRequest.steps.map((step, index) => {
                  const isCompleted = step.id <= lastRequest.currentStep; // 🔥 Ubah ini biar hijau semua kalau Selesai
                  const isCurrent = step.id === lastRequest.currentStep;

                  return (
                    <div key={step.id} className="flex md:flex-col items-center gap-3 md:gap-2 flex-1 w-full relative z-10 bg-white md:bg-transparent">
                      
                      {/* Garis Horizontal Aktif */}
                      {index < lastRequest.steps.length - 1 && (
                        <div className="hidden md:block absolute top-3 left-[60%] w-[80%] h-[2px] bg-transparent -z-10">
                          <div className={`h-full bg-[#00664b] transition-all duration-500 ${step.id < lastRequest.currentStep ? 'w-full' : 'w-0'}`} />
                        </div>
                      )}

                      {/* Icon */}
                      <div className="shrink-0 bg-white">
                        {isCompleted ? (
                          <CheckCircle2 className="text-[#00664b] bg-white rounded-full" size={26} />
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full border-[3px] border-[#00664b] bg-white animate-pulse" />
                        ) : (
                          <Circle className="text-zinc-300 bg-white rounded-full" size={24} />
                        )}
                      </div>

                      {/* Teks Deskripsi */}
                      <div className="text-left md:text-center bg-white px-2">
                        <p className={`text-sm font-medium ${isCurrent ? 'text-[#00664b] font-bold' : isCompleted ? 'text-zinc-900 font-bold' : 'text-zinc-400 font-bold'}`}>
                          {step.name}
                        </p>
                        <p className={`text-[10px] md:mt-0.5 font-bold ${isCurrent ? 'text-zinc-500' : isCompleted ? 'text-zinc-400' : 'text-zinc-300'}`}>
                          {isCurrent && lastRequest.currentStep !== 3 ? step.sub : isCompleted ? 'Selesai' : 'Belum'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-center text-zinc-500 py-6 border border-zinc-100 rounded-lg bg-zinc-50">
            Belum ada riwayat permintaan barang.
          </p>
        )}
      </div>
    </div>
  );
}