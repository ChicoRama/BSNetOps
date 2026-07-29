import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, X, AlertCircle, X as CloseIcon, CheckSquare, MoreVertical, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import TemplateDokumenA4 from '../../user/permintaan/TemplateDokumenA4'; 
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast'; // 🔥 Import Toast

export default function ApprovalRequest() {
  const printRef = useRef();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('Menunggu Manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('Semua Prioritas');
  const [selectedRows, setSelectedRows] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState(''); 
  const [confirmTargets, setConfirmTargets] = useState([]); 

  const [showBonPreview, setShowBonPreview] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchRequestsFromSupabase();
  }, []);

  const fetchRequestsFromSupabase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          nama_pemohon,
          unit,
          tanggal,
          jam,
          status,
          keperluan,
          request_items (
            id,
            kode_barang,
            nama_barang,
            jumlah_diminta,
            jumlah_disetujui,
            prioritas,
            remark
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData = data.map(req => {
          const itemPriorities = req.request_items.map(i => i.prioritas || 'Rendah');
          let mainPriority = 'Rendah';

          if (itemPriorities.includes('Tinggi')) {
            mainPriority = 'Tinggi'; 
          } else if (itemPriorities.includes('Sedang')) {
            mainPriority = 'Sedang'; 
          } else {
            mainPriority = 'Rendah'; 
          }

          return {
            id: req.id,
            namaPemohon: req.nama_pemohon,
            unit: req.unit,
            prioritas: mainPriority, 
            tanggal: req.tanggal,
            jam: req.jam,
            status: req.status,
            keperluan: req.keperluan,
            items: req.request_items.map(item => ({
              idItem: item.id,
              kodeBarang: item.kode_barang || '-',
              namaBarang: item.nama_barang,
              jumlahDiminta: item.jumlah_diminta,
              jumlahDisetujui: item.jumlah_disetujui, 
              prioritas: item.prioritas || 'Rendah', 
              remark: item.remark || ''
            }))
          };
        });
        setRequests(formattedData);
      }
    } catch (error) {
      console.error('Gagal memuat data permintaan:', error.message);
      toast.error('Gagal memuat data permintaan dari database!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedRows([]);
  }, [activeTab]);

  const filteredRequests = requests.filter(r => {
    const matchTab = r.status?.toLowerCase() === activeTab.toLowerCase();
    const matchPriority = selectedPriority === 'Semua Prioritas' ? true : r.prioritas === selectedPriority;
    const matchSearch = 
      r.namaPemohon.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.items.some(item => item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchTab && matchPriority && matchSearch;
  });

  const handleSelectRow = (e, id) => {
    e.stopPropagation(); 
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredRequests.map(r => r.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleOpenModal = (id) => {
    setSelectedId(id);
    setIsModalOpen(true);
  };

  const triggerConfirmation = (type, targetIds) => {
    setConfirmType(type);
    setConfirmTargets(targetIds);
    setIsConfirmOpen(true);
  };

  const handleFinalAction = async () => {
    const toastId = toast.loading('Memproses keputusan...');
    try {
      const targetRequests = requests.filter(r => confirmTargets.includes(r.id));

      if (confirmType === 'Selesai') {
        for (const req of targetRequests) {
          for (const item of req.items) {
            const qtyToProcess = item.jumlahDisetujui !== null && item.jumlahDisetujui !== undefined ? item.jumlahDisetujui : item.jumlahDiminta;
            
            const { data: itemData } = await supabase
              .from('items')
              .select('id, name, stock')
              .or(`id.eq.${item.kodeBarang},name.ilike.${item.namaBarang}`)
              .maybeSingle();

            if (itemData && itemData.stock < qtyToProcess) {
              toast.error(`Gagal ACC: Stok "${item.namaBarang}" tidak mencukupi! (Sisa: ${itemData.stock}, Disetujui: ${qtyToProcess})`, { id: toastId, duration: 5000 });
              return; 
            }
          }
        }

        for (const req of targetRequests) {
          for (const item of req.items) {
            const qtyToProcess = item.jumlahDisetujui !== null && item.jumlahDisetujui !== undefined ? item.jumlahDisetujui : item.jumlahDiminta;

            const { data: itemData } = await supabase
              .from('items')
              .select('id, stock')
              .or(`id.eq.${item.kodeBarang},name.ilike.${item.namaBarang}`)
              .maybeSingle();

            if (itemData) {
              const newStock = Math.max(0, itemData.stock - qtyToProcess);

              await supabase
                .from('items')
                .update({ stock: newStock })
                .eq('id', itemData.id);

              await supabase
                .from('activity_logs')
                .insert([{
                  transaction_id: req.id,
                  requester: req.namaPemohon,
                  item_name: item.namaBarang,
                  qty: qtyToProcess,
                  type: 'Pengeluaran',
                  manager_status: 'Approved',
                  admin_status: 'Selesai',
                  status: 'Selesai'
                }]);
            }
          }
        }
      }

      const { error } = await supabase
        .from('requests')
        .update({ status: confirmType })
        .in('id', confirmTargets);

      if (error) throw error;

      toast.success(`Permintaan berhasil ${confirmType === 'Selesai' ? 'di-ACC & Stok telah dipotong' : 'ditolak'}!`, { id: toastId });

      setSelectedRows([]);
      setIsConfirmOpen(false);
      setIsModalOpen(false);
      fetchRequestsFromSupabase();

    } catch (error) {
      console.error('Gagal memproses:', error.message);
      toast.error('Terjadi kesalahan saat memproses data ke database.', { id: toastId });
    }
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);

    const toastId = toast.loading('Menyiapkan file PDF...');

    const opt = {
      margin:       0,
      filename:     `Bon_Barang_${activeDetail?.id || 'BSN'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
      setIsMenuOpen(false);
      toast.success('PDF berhasil diunduh!', { id: toastId });
    }).catch((err) => {
      console.error("Error:", err);
      setIsExporting(false);
      setIsMenuOpen(false);
      toast.error('Gagal mengunduh PDF.', { id: toastId });
    });
  };

  const activeDetail = requests.find(item => item.id === selectedId);

  const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession')) || {};
  const namaManager = activeUser.namaLengkap || activeUser.name || activeUser.username || 'Manager';

  const isApproved = activeDetail?.status?.toLowerCase() === 'selesai';

  const qrAdmin = isApproved ? `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=Disetujui_Oleh_Admin_Agus_ID:${activeDetail?.id}` : null;
  const qrManager = isApproved ? `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=Disetujui_Oleh_Manager_${namaManager.replace(/\s+/g, '_')}_ID:${activeDetail?.id}` : null;

  const mappedFormData = activeDetail ? {
    divisi: activeDetail.unit,
    alasanDibutuhkan: activeDetail.keperluan,
    namaLengkap: activeDetail.namaPemohon,
    status: activeDetail.status,
    isApproved: isApproved,
    adminName: 'Mas Agus',
    managerName: namaManager,
    qrAdmin: qrAdmin,
    qrManager: qrManager
  } : {};

  const mappedDaftarBarang = activeDetail ? activeDetail.items.map(item => ({
    namaAset: item.namaBarang,
    jumlahDiminta: item.jumlahDiminta,
    jumlahDisetujui: item.jumlahDisetujui,
    remark: item.remark
  })) : [];

  return (
    <div className="w-full relative animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800">
      
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Final Approval Manager</h2>
          <p className="text-xs text-white font-medium mt-0.5">Tinjau permohonan yang telah diproses Admin dan berikan ACC Final.</p>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-6 border-b border-[#00664b]/20 text-sm">
          {['Menunggu Manager', 'Selesai', 'Ditolak'].map((status) => (
            <button 
              key={status}
              onClick={() => setActiveTab(status)}
              className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer text-white capitalize ${
                activeTab === status ? 'border-white font-bold' : 'border-transparent opacity-75'
              }`}
            >
              <span>{status === 'Menunggu Manager' ? 'Menunggu ACC' : status}</span>
              <span className="bg-[#00664b] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {requests.filter(r => r.status?.toLowerCase() === status.toLowerCase()).length}
              </span>
            </button>
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Cari ID, pemohon, atau barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#00664b] transition-colors"
              />
            </div>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full sm:w-auto bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 focus:outline-none focus:border-[#00664b] cursor-pointer"
            >
              <option>Semua Prioritas</option>
              <option>Tinggi</option>
              <option>Sedang</option>
              <option>Rendah</option>
            </select>
          </div>

          <div 
            className={`transition-all duration-500 ease-out overflow-hidden flex items-center ${
              selectedRows.length > 0 && activeTab === 'Menunggu Manager' 
                ? 'opacity-100 translate-x-0 max-w-[500px] ml-4' 
                : 'opacity-0 translate-x-12 max-w-0 ml-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center w-max">
              <span className="text-xs font-bold text-zinc-500 mr-3 whitespace-nowrap">
                {selectedRows.length} Terpilih
              </span>
              <button 
                onClick={() => triggerConfirmation('Selesai', selectedRows)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00664b] hover:bg-[#00553e] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer mr-2 whitespace-nowrap"
              >
                <Check size={14} /> ACC Semua
              </button>
              <button 
                onClick={() => triggerConfirmation('Ditolak', selectedRows)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <X size={14} /> Tolak Semua
              </button>
            </div>
          </div>
        </div>

        {/* Tabel Request */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] font-bold text-white uppercase bg-[#58a27d]">
                  <th className="py-3 px-4 w-12 text-center">
                    {activeTab === 'Menunggu Manager' && (
                      <input 
                        type="checkbox"
                        checked={selectedRows.length === filteredRequests.length && filteredRequests.length > 0}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-[#00664b] focus:ring-[#00664b] cursor-pointer accent-[#00664b]"
                      />
                    )}
                  </th>
                  <th className="py-3 px-2">ID Permintaan</th>
                  <th className="py-3 px-4">Pemohon</th>
                  <th className="py-3 px-4">Daftar Barang</th>
                  <th className="py-3 px-4 text-center">Prioritas Utama (Urgent)</th>
                  <th className="py-3 px-4">Tanggal Pengajuan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 font-medium text-xs">
                      Memuat data dari database...
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => handleOpenModal(item.id)}
                      className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${selectedRows.includes(item.id) ? 'bg-emerald-50/40' : ''}`}
                    >
                      <td className="py-4 px-4 text-center">
                        {activeTab === 'Menunggu Manager' && (
                          <input 
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={(e) => handleSelectRow(e, item.id)}
                            onClick={(e) => e.stopPropagation()} 
                            className="w-3.5 h-3.5 rounded border-zinc-300 text-[#00664b] focus:ring-[#00664b] cursor-pointer accent-[#00664b]"
                          />
                        )}
                      </td>
                      <td className="py-4 px-2 font-mono font-bold text-zinc-900">{item.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-800">{item.namaPemohon}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">{item.unit}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-zinc-700 block truncate max-w-[200px]">
                          {item.items.map(i => i.namaBarang).join(', ')}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">Total: {item.items.length} jenis barang</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border ${
                          item.prioritas === 'Tinggi' ? 'bg-red-50 text-red-600 border-red-200' : 
                          item.prioritas === 'Sedang' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {item.prioritas}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-zinc-500 font-medium">
                        <div className="flex flex-col">
                          <span>{item.tanggal}</span>
                          <span className="text-[10px] text-zinc-400">{item.jam}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${
                          item.status.toLowerCase() === 'menunggu manager' ? 'bg-amber-100/70 text-amber-600 border-amber-200/50' :
                          item.status.toLowerCase() === 'selesai' ? 'bg-emerald-100/70 text-emerald-600 border-emerald-200/50' : 'bg-red-100/70 text-red-600 border-red-200/50'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400 font-medium text-xs">
                      Tidak ada data permintaan yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL LEVEL 1: DETAIL PERMINTAAN */}
      {isModalOpen && activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight">Detail Berkas Permintaan</h3>
                <p className="text-[10px] font-mono font-bold text-[#00664b] mt-0.5 tracking-wider">{activeDetail.id}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs font-medium text-zinc-700 overflow-y-auto">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Nama Pemohon</span>
                  <span className="text-zinc-900 font-bold text-sm">{activeDetail.namaPemohon}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Unit / Cabang</span>
                  <span className="text-zinc-900 font-bold">{activeDetail.unit}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Tanggal Pengajuan</span>
                  <span>{activeDetail.tanggal} ({activeDetail.jam})</span>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Status Saat Ini</span>
                  <span className="font-bold text-[#00664b] uppercase">{activeDetail.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-zinc-900 mb-3 flex items-center gap-2 text-sm">
                  <CheckSquare size={16} className="text-[#00664b]" /> Daftar Barang (Penyesuaian Admin)
                </h4>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-100 text-[10px] uppercase text-zinc-500 border-b border-zinc-200">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3">Nama Barang</th>
                        <th className="p-3 text-center">Prioritas Item</th>
                        <th className="p-3 text-center w-20">Diminta</th>
                        <th className="p-3 text-center w-24">Disetujui Admin</th>
                        <th className="p-3">Alasan / Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {activeDetail.items.map((item, index) => (
                        <tr key={index} className="hover:bg-zinc-50">
                          <td className="p-3 text-center text-zinc-400 font-mono">{index + 1}</td>
                          <td className="p-3 font-bold text-zinc-700">{item.namaBarang}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.prioritas === 'Tinggi' ? 'bg-red-50 text-red-600' :
                              item.prioritas === 'Sedang' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.prioritas}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-zinc-500">{item.jumlahDiminta}</td>
                          <td className="p-3 text-center font-bold text-[#00664b]">{item.jumlahDisetujui ?? item.jumlahDiminta} Unit</td>
                          <td className="p-3 text-zinc-500 italic">{item.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-100 bg-zinc-50 flex flex-col gap-3 shrink-0">
              {activeDetail.status?.toLowerCase() === 'menunggu manager' ? (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowBonPreview(true)}
                    className="flex-1 py-2.5 border border-[#00664b] text-[#00664b] bg-white hover:bg-[#e7f0ec] text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    Lihat Bon
                  </button>
                  <button 
                    onClick={() => triggerConfirmation('Selesai', [activeDetail.id])}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00664b] hover:bg-[#004d38] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Check size={16} /> ACC Final (Potong Stok)
                  </button>
                  <button 
                    onClick={() => triggerConfirmation('Ditolak', [activeDetail.id])}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <X size={16} /> Tolak
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-zinc-400 uppercase tracking-wider bg-zinc-200/50 px-3 py-1.5 rounded-lg border border-zinc-200">
                    Status: <span className={activeDetail.status?.toLowerCase() === 'selesai' ? 'text-emerald-600' : 'text-red-600'}>{activeDetail.status}</span>
                  </div>
                  <button 
                    onClick={() => setShowBonPreview(true)}
                    className="px-6 py-2.5 border border-[#00664b] text-[#00664b] bg-white hover:bg-[#e7f0ec] text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    Lihat Bon
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI CUSTOM */}
      {isConfirmOpen && confirmTargets.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150 text-center">
            <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-full shadow-sm border ${confirmType === 'Selesai' ? 'bg-emerald-50 border-emerald-100 text-[#00664b]' : 'bg-red-50 border-red-100 text-red-500'}`}>
              <AlertCircle size={24} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-black text-zinc-900">Konfirmasi ACC Final</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Apakah Anda yakin ingin <span className={`font-bold ${confirmType === 'Selesai' ? 'text-[#00664b]' : 'text-red-500'}`}>
                  {confirmType === 'Selesai' ? 'menyetujui (ACC)' : 'menolak'}
                </span>{' '}
                {confirmTargets.length > 1 ? (
                  <span className="font-bold text-zinc-800">{confirmTargets.length} permintaan terpilih</span>
                ) : (
                  <span>permintaan dari <span className="font-bold text-zinc-800">{requests.find(r => r.id === confirmTargets[0])?.namaPemohon}</span></span>
                )}?
                {confirmType === 'Selesai' && (
                  <span className="block mt-2 text-[11px] text-amber-600 font-semibold bg-amber-50 p-1.5 rounded border border-amber-200">
                    ⚠️ ACC ini bersifat final. Stok barang akan dipotong dari gudang berdasarkan jumlah disetujui Admin.
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={handleFinalAction}
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md transition-colors ${
                  confirmType === 'Selesai' ? 'bg-[#00664b] hover:bg-[#004d38]' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Ya, Konfirmasi
              </button>
              <button 
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-2.5 bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW BON */}
      {showBonPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[95vh] overflow-hidden relative">
            
            <div className="px-6 py-4 bg-white border-b border-zinc-300 flex justify-between items-center z-20 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800">Preview Bon Barang</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"><MoreVertical size={20} /></button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 z-30">
                      <button onClick={handleDownloadPDF} disabled={isExporting} className="w-full px-4 py-2 text-left text-xs font-semibold hover:bg-zinc-50 flex items-center gap-2 cursor-pointer">
                        <Download size={14} className="text-[#00664b]" /> {isExporting ? 'Mengunduh...' : 'Download PDF'}
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => { setShowBonPreview(false); setIsMenuOpen(false); }} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg cursor-pointer"><CloseIcon size={20} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-8 flex justify-center bg-zinc-200">
              <div className="shadow-lg border border-zinc-300 bg-white">
                <TemplateDokumenA4 ref={printRef} formData={mappedFormData} daftarBarang={mappedDaftarBarang} />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}