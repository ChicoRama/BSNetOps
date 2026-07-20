import html2pdf from 'html2pdf.js';
import React, { useState, useRef } from 'react';
import { Search, CheckSquare, X, Check, MoreVertical, Download } from 'lucide-react';
import TemplateDokumenA4 from '../../user/permintaan/TemplateDokumenA4';

export default function PenyetujuanBarang() {
  const printRef = useRef();
  const [isExporting, setIsExporting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [requests, setRequests] = useState([
    {
      id: 'REQ-20260720-001',
      pemohon: 'Chico Diar Ramadhan',
      unit: 'KC Semarang',
      tanggal: '2026-07-20',
      prioritas: 'Tinggi',
      status: 'Menunggu',
      isDiserahkan: false, // Status penyerahan fisik oleh Agus
      keteranganPemohon: 'Untuk kebutuhan tim lapangan',
      items: [
        { idItem: 'ITM-01', namaBarang: 'Kertas HVS A4', kodeBarang: 'ATK-A4-01', stokGudang: 10, jmlDiminta: 5, jmlDisetujui: 5, remark: '' },
        { idItem: 'ITM-02', namaBarang: 'Tinta Printer Epson Black', kodeBarang: 'TIN-EP-01', stokGudang: 2, jmlDiminta: 3, jmlDisetujui: 2, remark: 'Stok tidak mencukupi, hanya bisa 2.' }
      ]
    }
  ]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBonPreview, setShowBonPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = requests.filter(req =>
    req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.pemohon.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleReview = (req) => {
    setSelectedRequest(JSON.parse(JSON.stringify(req)));
    setIsModalOpen(true);
  };

  const handleQtyChange = (idItem, newQty) => {
    setSelectedRequest((prev) => {
      const updatedItems = prev.items.map(item => 
        item.idItem === idItem ? { ...item, jmlDisetujui: parseInt(newQty) || 0 } : item
      );
      return { ...prev, items: updatedItems };
    });
  };

  const handleRemarkChange = (idItem, newRemark) => {
    setSelectedRequest((prev) => {
      const updatedItems = prev.items.map(item => 
        item.idItem === idItem ? { ...item, remark: newRemark } : item
      );
      return { ...prev, items: updatedItems };
    });
  };

  // 🔥 FUNGSI SETUJUI & SERAHKAN FISIK OLEH ADMIN (AGUS)
  const handleApproveAndHandover = () => {
    const isExceedingStock = selectedRequest.items.some(item => item.jmlDisetujui > item.stokGudang);
    if (isExceedingStock) {
      alert("Gagal: Ada barang yang jumlah disetujuinya melebihi stok gudang!");
      return;
    }

    const todayStr = new Date().toLocaleDateString('id-ID');

    setRequests((prev) => prev.map(req => 
      req.id === selectedRequest.id 
        ? { ...selectedRequest, status: 'Diserahkan', isDiserahkan: true, tanggalDiserahkan: todayStr } 
        : req
    ));
    
    alert(`Permintaan ${selectedRequest.id} berhasil disetujui dan diserahkan oleh Agus (Admin GA). Tanda tangan digital QR telah diterbitkan!`);
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleReject = () => {
    if (window.confirm("Apakah Anda yakin ingin menolak permintaan ini?")) {
      setRequests((prev) => prev.map(req => 
        req.id === selectedRequest.id ? { ...selectedRequest, status: 'Ditolak' } : req
      ));
      setIsModalOpen(false);
      setSelectedRequest(null);
    }
  };

  // Fungsi Download PDF Bon menggunakan html2pdf.js
  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);

    const opt = {
      margin:       0,
      filename:     `Bon_Barang_${selectedRequest?.id || 'BSN'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
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

  // Mapping data untuk Bon Preview
  const mappedFormData = selectedRequest ? {
    divisi: selectedRequest.unit,
    alasanDibutuhkan: selectedRequest.keteranganPemohon,
    namaLengkap: selectedRequest.pemohon
  } : {};

  const mappedDaftarBarang = selectedRequest ? selectedRequest.items.map(item => ({
    namaAset: item.namaBarang,
    jumlah: item.jmlDisetujui || item.jmlDiminta
  })) : [];

  const mappedAdminData = selectedRequest ? {
    isDiserahkan: selectedRequest.isDiserahkan,
    tanggal: selectedRequest.tanggalDiserahkan || new Date().toLocaleDateString('id-ID')
  } : {};

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Penyetujuan & Penyerahan Barang</h2>
          <p className="text-xs text-white/80 mt-0.5">Kelola permintaan masuk, cek ketersediaan stok, dan konfirmasi penyerahan aset.</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex bg-white p-4 rounded-xl shadow-md border border-zinc-200/80">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID, Pemohon, atau Unit..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b]"
          />
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white border border-zinc-200/80 rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#58a27d] text-white text-xs uppercase font-semibold">
            <tr>
              <th className="p-4 w-40">ID Permintaan</th>
              <th className="p-4">Pemohon</th>
              <th className="p-4">Unit</th>
              <th className="p-4">Tgl Dibutuhkan</th>
              <th className="p-4 text-center">Prioritas</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredRequests.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-zinc-500 text-sm">Tidak ada data permintaan ditemukan</td></tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50/40 transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-zinc-900">{req.id}</td>
                  <td className="p-4 font-bold text-zinc-800">{req.pemohon}</td>
                  <td className="p-4 text-zinc-600">{req.unit}</td>
                  <td className="p-4 text-zinc-600">{req.tanggal}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                      req.prioritas === 'Tinggi' ? 'bg-red-50 text-red-600 border-red-100' :
                      req.prioritas === 'Sedang' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {req.prioritas}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider border ${
                      req.status === 'Menunggu' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      req.status === 'Diserahkan' ? 'bg-green-50 text-green-600 border-green-100' : 
                      req.status === 'Ditolak' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 flex justify-center">
                    <button 
                      onClick={() => handleReview(req)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00664b] text-white hover:bg-[#00553e] rounded-lg text-xs font-semibold shadow-md transition-all cursor-pointer"
                    >
                      <CheckSquare size={14} /> Review / Bon
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL ADJUSTMENT & PERSETUJUAN */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Proses Penyetujuan & Penyerahan Barang</h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">ID: {selectedRequest.id}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/50">
              
              {/* DETAIL INFORMASI & TTD DIGITAL PEMOHON & ADMIN */}
              <div className="mb-6 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-zinc-100 pb-2">Informasi Pemohon</h3>
                  <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-y-2 text-sm text-gray-700">
                    <span className="font-medium text-zinc-500">Nama Lengkap</span><span className="font-bold text-zinc-900">: {selectedRequest.pemohon}</span>
                    <span className="font-medium text-zinc-500">Unit / Cabang</span><span>: {selectedRequest.unit}</span>
                    <span className="font-medium text-zinc-500">Status Aksi</span><span className="font-bold text-[#00664b]">: {selectedRequest.status}</span>
                    <span className="font-medium text-zinc-500">Keterangan</span><span className="italic text-zinc-600">: {selectedRequest.keteranganPemohon || '-'}</span>
                  </div>
                </div>

                {/* QR Code Pemohon */}
                <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-50/50 min-w-[130px]">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Requested by ${selectedRequest.pemohon}`)}`} 
                    alt="QR Pemohon" 
                    className="w-16 h-16 mix-blend-multiply opacity-90"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 font-bold">TTD Pemohon</span>
                </div>

                {/* QR Code Admin Agus (Jika sudah diserahkan) */}
                <div className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg min-w-[130px] ${selectedRequest.isDiserahkan ? 'border-emerald-300 bg-emerald-50/50' : 'border-zinc-200 bg-zinc-100 opacity-60'}`}>
                  {selectedRequest.isDiserahkan ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Approved & Handed over by Agus (Admin GA)`)}`} 
                      alt="QR Admin Agus" 
                      className="w-16 h-16 mix-blend-multiply opacity-90"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center text-[10px] text-center text-zinc-400 font-mono">Belum Diserahkan</div>
                  )}
                  <span className="text-[10px] text-zinc-700 font-mono mt-1 font-bold">Agus (Admin GA)</span>
                </div>

              </div>

              <h3 className="font-bold text-gray-800 mb-3 text-sm">Penyesuaian Barang (Adjustment)</h3>
              
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#58a27d] text-white text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-3 w-1/4">Nama Barang</th>
                      <th className="p-3 text-center">Stok</th>
                      <th className="p-3 text-center">Diminta</th>
                      <th className="p-3 w-32">Disetujui</th>
                      <th className="p-3 w-1/3">Catatan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedRequest.items.map((item) => (
                      <tr key={item.idItem} className="hover:bg-zinc-50/40">
                        <td className="p-3">
                          <div className="font-bold text-zinc-800 capitalize">{item.namaBarang}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.kodeBarang}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-md text-xs font-bold border ${item.stokGudang > 0 ? 'bg-[#e7f0ec] text-[#00664b] border-[#00664b]/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {item.stokGudang}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-zinc-600">{item.jmlDiminta}</td>
                        <td className="p-3">
                          <input 
                            type="number" 
                            min="0"
                            max={item.stokGudang}
                            value={item.jmlDisetujui}
                            onChange={(e) => handleQtyChange(item.idItem, e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-sm text-center bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#00664b]/40"
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="text" 
                            placeholder="Alasan penyesuaian..."
                            value={item.remark}
                            onChange={(e) => handleRemarkChange(item.idItem, e.target.value)}
                            className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#00664b]/40"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal - Aksi */}
            <div className="px-6 py-4 border-t border-zinc-200 bg-white flex justify-between items-center rounded-b-2xl">
              <button 
                onClick={handleReject}
                className="px-4 py-2 border border-red-200 text-red-600 bg-white hover:bg-red-50 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
              >
                Tolak Permintaan
              </button>

              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowBonPreview(true)}
                  className="px-5 py-2 border border-[#00664b] text-[#00664b] bg-white hover:bg-[#e7f0ec] font-semibold rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
                >
                  Lihat Bon Permintaan
                </button>
                <button 
                  onClick={handleApproveAndHandover}
                  className="px-5 py-2 bg-[#00664b] hover:bg-[#00553e] text-white font-semibold rounded-lg text-sm transition-colors shadow-md flex items-center justify-center cursor-pointer"
                >
                  Setujui & Serahkan Fisik
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PREVIEW BON */}
      {showBonPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[95vh] overflow-hidden relative">
            
            {/* Header Modal Preview dengan Tombol Titik Tiga */}
            <div className="px-6 py-4 bg-white border-b border-zinc-300 flex justify-between items-center z-20 shadow-sm">
              <h2 className="text-lg font-bold text-gray-800">Preview Bon Barang</h2>
              
              <div className="flex items-center gap-3">
                {/* Dropdown Menu Titik Tiga */}
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
                  <X size={20} />
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