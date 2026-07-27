import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, XCircle, PackageCheck, Eye, ArrowLeft, FileText, Download, MoreVertical, X as CloseIcon } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import TemplateDokumenA4 from '../permintaan/TemplateDokumenA4'; // Sesuaikan path relatif ke file TemplateDokumenA4.jsx kamu
import { supabase } from '../../../../supabaseClient'; 

export default function RiwayatPermintaan() {
  const printRef = useRef();
  const [laporanRiwayat, setLaporanRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaporanId, setSelectedLaporanId] = useState(null);

  // State untuk Preview Bon & Export PDF
  const [showBonPreview, setShowBonPreview] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchUserRequests();
  }, []);

  const fetchUserRequests = async () => {
    setLoading(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const activeEmail = activeUser?.email || activeUser?.mail || '';

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          tanggal,
          jam,
          status,
          nama_pemohon,
          email_pemohon,
          unit,
          keperluan,
          is_diserahkan,
          tanggal_diserahkan,
          request_items (
            id,
            nama_barang,
            jumlah_diminta,
            jumlah_disetujui,
            prioritas,
            remark,
            is_received
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const filteredData = activeEmail 
          ? data.filter(req => req.email_pemohon === activeEmail)
          : [];

        const formatted = filteredData.map(req => {
          let currentStatus = 'Pending';
          const dbStatus = req.status ? req.status.toLowerCase() : 'menunggu';

          const allItemsReceived = req.request_items.length > 0 && req.request_items.every(i => i.is_received === true);

          if (dbStatus === 'menunggu' || dbStatus === 'menunggu manager') {
            currentStatus = 'Pending';
          } else if (dbStatus === 'ditolak') {
            currentStatus = 'Rejected';
          } else if (dbStatus === 'selesai') {
            currentStatus = allItemsReceived ? 'Completed' : 'Approved'; 
          }

          const itemPriorities = req.request_items.map(i => i.prioritas || 'Rendah');
          let mainPriority = 'Rendah';
          if (itemPriorities.includes('Tinggi')) mainPriority = 'Tinggi';
          else if (itemPriorities.includes('Sedang')) mainPriority = 'Sedang';

          return {
            id: req.id,
            tgl: req.tanggal,
            pemohon: req.nama_pemohon,
            unit: req.unit || '',
            statusDb: req.status, // Status asli dari DB untuk cek ACC
            isDiserahkan: req.is_diserahkan || false,
            tanggalDiserahkan: req.tanggal_diserahkan || '',
            keperluan: req.keperluan || '-',
            prioritasUtama: mainPriority,
            status: currentStatus, 
            items: req.request_items.map(item => {
              let sItem = 'Pending';
              if (dbStatus === 'ditolak') sItem = 'Rejected';
              else if (dbStatus === 'selesai') {
                sItem = item.is_received ? 'Received' : 'Approved'; 
              }

              return {
                idItem: item.id,
                barang: item.nama_barang,
                jumlahDiminta: item.jumlah_diminta,
                jumlahDisetujui: item.jumlah_disetujui ?? item.jumlah_diminta,
                prioritasItem: item.prioritas || 'Rendah',
                statusItem: sItem,
                remark: item.remark || ''
              };
            })
          };
        });

        setLaporanRiwayat(formatted);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat dari database:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTerimaBarang = async (laporanId, itemId) => {
    try {
      const { error } = await supabase
        .from('request_items')
        .update({ is_received: true }) 
        .eq('id', itemId);

      if (error) throw error;

      setLaporanRiwayat(prevLaporan =>
        prevLaporan.map(laporan => {
          if (laporan.id === laporanId) {
            const updatedItems = laporan.items.map(item =>
              item.idItem === itemId ? { ...item, statusItem: 'Received' } : item
            );
            
            const allDone = updatedItems.every(i => i.statusItem === 'Received' || i.statusItem === 'Rejected');
            
            return {
              ...laporan,
              items: updatedItems,
              status: allDone ? 'Completed' : laporan.status 
            };
          }
          return laporan;
        })
      );
    } catch (error) {
      console.error("Gagal konfirmasi terima barang:", error.message);
      alert("Terjadi kesalahan saat mengkonfirmasi barang.");
    }
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);

    const opt = {
      margin:      0,
      filename:    `Bon_Barang_${activeLaporan?.id || 'BSN'}.pdf`,
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
      setIsMenuOpen(false);
    }).catch((err) => {
      console.error("Error:", err);
      setIsExporting(false);
      setIsMenuOpen(false);
    });
  };

  const activeLaporan = laporanRiwayat.find(l => l.id === selectedLaporanId);

  // Mapping data untuk TemplateDokumenA4 (Termasuk QR Code Admin & Manager)
  const isApprovedByManager = activeLaporan?.statusDb?.toLowerCase() === 'selesai';
  const isHandedOverByAdmin = activeLaporan?.isDiserahkan === true;

  const qrAdmin = isHandedOverByAdmin ? `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=Disetujui_Oleh_Admin_Mas_Agus_ID:${activeLaporan?.id}` : null;
  const qrManager = isApprovedByManager ? `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=Disetujui_Oleh_Atasan_ID:${activeLaporan?.id}` : null;

  const mappedFormData = activeLaporan ? {
    divisi: activeLaporan.unit,
    alasanDibutuhkan: activeLaporan.keperluan,
    namaLengkap: activeLaporan.pemohon,
    status: activeLaporan.statusDb,
    isApproved: isApprovedByManager,
    adminName: 'Mas Agus',
    managerName: 'Atasan / Manager',
    qrAdmin: qrAdmin,
    qrManager: qrManager
  } : {};

  const mappedDaftarBarang = activeLaporan ? activeLaporan.items.map(item => ({
    namaAset: item.barang,
    jumlahDiminta: item.jumlahDiminta,
    jumlahDisetujui: item.jumlahDisetujui,
    remark: item.remark
  })) : [];

  const mappedAdminData = activeLaporan ? {
    isDiserahkan: activeLaporan.isDiserahkan,
    tanggal: activeLaporan.tanggalDiserahkan || new Date().toLocaleDateString('id-ID')
  } : {};

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Riwayat Log Permintaan</h2>
        <p className="text-xs text-white font-normal mt-1">
          Pantau status persetujuan berkas permohonan inventaris Anda secara real-time.
        </p>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {!selectedLaporanId ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-[#58a27d] text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">ID Permintaan</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-center">Total Barang</th>
                  <th className="py-3 px-4 text-center">Prioritas</th>
                  <th className="py-3 px-4 text-center">Status Laporan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-zinc-700 divide-y divide-zinc-100">
                {loading ? (
                  <tr><td colSpan="6" className="py-12 text-center text-zinc-400">Memuat riwayat dari database...</td></tr>
                ) : laporanRiwayat.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-zinc-400">Belum ada riwayat permintaan ditemukan di database.</td></tr>
                ) : (
                  laporanRiwayat.map((laporan) => (
                    <tr key={laporan.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#00664b] font-mono">{laporan.id}</td>
                      <td className="py-3.5 px-4 text-zinc-600 font-normal">{laporan.tgl}</td>
                      <td className="py-3.5 px-4 text-center font-bold">{laporan.items.length} Item</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          laporan.prioritasUtama === 'Tinggi' ? 'bg-red-50 text-red-600 border-red-200' :
                          laporan.prioritasUtama === 'Sedang' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {laporan.prioritasUtama}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center">
                          {laporan.status === 'Pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                              <Clock size={12} /> Menunggu Proses
                            </span>
                          )}
                          {laporan.status === 'Approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                              <CheckCircle2 size={12} /> ACC Final (Siap Diambil)
                            </span>
                          )}
                          {laporan.status === 'Completed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#00664b] border border-emerald-100">
                              <PackageCheck size={12} /> Selesai
                            </span>
                          )}
                          {laporan.status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                              <XCircle size={12} /> Ditolak
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLaporanId(laporan.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00664b] text-white hover:bg-[#004d38] text-[10px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedLaporanId(null)}
                  className="p-1.5 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                    <FileText size={16} className="text-[#00664b]" /> {activeLaporan.id}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">{activeLaporan.tgl}</p>
                </div>
              </div>

              {/* TOMBOL LIHAT BON & DOWNLOAD PDF DI HALAMAN DETAIL */}
              <button 
                onClick={() => setShowBonPreview(true)}
                className="px-4 py-2 bg-[#00664b] hover:bg-[#004d38] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                <FileText size={14} /> Lihat Bon Permintaan
              </button>
            </div>

            <div className="overflow-x-auto p-4">
              <h4 className="text-xs font-bold text-zinc-700 mb-3 uppercase tracking-wider">Rincian Barang yang Diajukan</h4>
              <table className="w-full text-left border border-zinc-200 rounded-xl overflow-hidden border-collapse">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 text-[11px] font-bold">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4">Nama Barang</th>
                    <th className="py-2.5 px-4 text-center">Prioritas</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Disetujui</th>
                    <th className="py-2.5 px-4 text-center">Status Item</th>
                    <th className="py-2.5 px-4 text-center">Aksi Penerimaan</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold text-zinc-700 divide-y divide-zinc-200">
                  {activeLaporan.items.map((item, index) => (
                    <tr key={item.idItem} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 text-center text-zinc-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-4 text-zinc-900 capitalize">{item.barang}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.prioritasItem === 'Tinggi' ? 'bg-red-50 text-red-600 border-red-200' :
                          item.prioritasItem === 'Sedang' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {item.prioritasItem}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#00664b]">{item.jumlah} Unit</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          {item.statusItem === 'Pending' && <span className="text-amber-600 font-bold flex items-center gap-1"><Clock size={12}/> Menunggu ACC</span>}
                          {item.statusItem === 'Approved' && <span className="text-blue-600 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Siap Diambil</span>}
                          {item.statusItem === 'Received' && <span className="text-emerald-600 font-bold flex items-center gap-1"><PackageCheck size={12}/> Diterima</span>}
                          {item.statusItem === 'Rejected' && <span className="text-red-600 font-bold flex items-center gap-1"><XCircle size={12}/> Ditolak</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.statusItem === 'Pending' && <span className="text-zinc-400 text-[10px] italic">Menunggu persetujuan Manager...</span>}
                        {item.statusItem === 'Rejected' && <span className="text-zinc-400 text-[10px] italic">-</span>}
                        {item.statusItem === 'Received' && <span className="text-[#00664b] text-[10px] font-bold">Terverifikasi ✓</span>}
                        {item.statusItem === 'Approved' && (
                          <button
                            onClick={() => handleTerimaBarang(activeLaporan.id, item.idItem)}
                            className="px-3 py-1.5 bg-[#58a27d] hover:bg-[#4a8a69] text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm active:scale-95 cursor-pointer"
                          >
                            Barang Diterima
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PREVIEW BON & DOWNLOAD PDF */}
      {showBonPreview && activeLaporan && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[95vh] overflow-hidden relative">
            
            <div className="px-6 py-4 bg-white border-b border-zinc-300 flex justify-between items-center z-20 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800">Preview Bon Barang</h2>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <MoreVertical size={20} />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <button 
                        onClick={handleDownloadPDF}
                        disabled={isExporting}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Download size={14} className="text-[#00664b]" />
                        <span>{isExporting ? 'Mengunduh...' : 'Download PDF'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => { setShowBonPreview(false); setIsMenuOpen(false); }} 
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-8 flex justify-center bg-zinc-200">
              <div className="shadow-lg border border-zinc-300 bg-white">
                <TemplateDokumenA4 
                  ref={printRef}
                  formData={mappedFormData} 
                  daftarBarang={mappedDaftarBarang} 
                  adminData={mappedAdminData}
                />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}