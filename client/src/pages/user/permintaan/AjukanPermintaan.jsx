import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import TemplateDokumenA4 from './TemplateDokumenA4';

export default function AjukanPermintaan() {
  const printRef = useRef();

  //  AMBIL DATA BANYAK BARANG DARI KERANJANG
  const savedAssets = JSON.parse(localStorage.getItem('selectedAssetData')) || [];
  const isMultiItem = Array.isArray(savedAssets) && savedAssets.length > 0;

  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  
  const [formData, setFormData] = useState({
    namaLengkap: '', nipPegawai: '', divisi: '', jabatan: '', email: '', noTelepon: '',
    tanggalDibutuhkan: '', 
    prioritas: '', 
    alasanDibutuhkan: ''
  });

  const [daftarBarang, setDaftarBarang] = useState([]);

  useEffect(() => {
    if (isMultiItem) {
      const items = savedAssets.map(asset => ({
        namaAset: asset.namaAset,
        kodeAset: asset.kodeAset,
        jumlah: asset.jumlah || 1
      }));
      setDaftarBarang(items);
      localStorage.removeItem('selectedAssetData');
    }

    const activeUser = JSON.parse(localStorage.getItem('userProfile'));
    
    if (activeUser) {
      setFormData(prev => ({
        ...prev,
        namaLengkap: activeUser.namaLengkap || activeUser.name || '',
        nipPegawai: activeUser.nipPegawai || activeUser.nip || '',
        divisi: activeUser.divisi || '',
        jabatan: activeUser.jabatan || '',
        email: activeUser.email || '',
        noTelepon: activeUser.noTelepon || activeUser.phone || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        namaLengkap: 'Chico Diar Ramadhan',
        nipPegawai: '21120124140150',
        divisi: 'KC Semarang', 
        jabatan: 'User', 
        email: 'chico.diar@example.com',
        noTelepon: '085157778659'
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "alasanDibutuhkan") {
      const kata = value.trim().split(/\s+/);
      if (kata.length > 40) {
        alert("Batas maksimum pengisian keterangan adalah 40 kata agar muat dalam format cetak!");
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQtyChange = (index, val) => {
    const updated = [...daftarBarang];
    updated[index].jumlah = parseInt(val) || 1;
    setDaftarBarang(updated);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (currentStep === 1) setCurrentStep(2);
    else if (currentStep === 2) {
      if (daftarBarang.length === 0) {
        alert("Belum ada barang yang diajukan. Silakan pilih kembali dari katalog.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmitFinal = () => {
    console.log("Data Sent to Backend:", { ...formData, barang: daftarBarang });
    setCurrentStep(4);
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);

    const opt = {
      margin:       0,
      filename:     `Bon_Barang_${formData.namaLengkap ? formData.namaLengkap.replace(/\s+/g, '_') : 'BSN'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const style = window.getComputedStyle(el);
            if (style.color && style.color.includes('oklch')) el.style.color = '#000000';
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) el.style.backgroundColor = '#ffffff';
            if (style.borderColor && style.borderColor.includes('oklch')) el.style.borderColor = '#000000';
          });
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    }).catch((err) => {
      console.error("Error:", err);
      setIsExporting(false);
    });
  };

  // FUNGSI BARU: Mendapatkan tanggal hari ini (Format YYYY-MM-DD)
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      
      {/* HEADER WIZARD */}
      {currentStep <= 3 && (
        <div className="w-full max-w-2xl mb-6 text-white print:hidden">
          <h1 className="text-2xl font-bold">Ajukan Permintaan</h1>
          <p className="text-sm opacity-90">Isi formulir untuk mengajukan permintaan aset kantor</p>
          
          <div className="flex items-center space-x-4 mt-4 text-xs">
            <div className={`flex items-center space-x-1 ${currentStep === 1 ? 'font-semibold' : 'opacity-60'}`}>
              <span className={`rounded-full w-5 h-5 flex items-center justify-center font-bold ${currentStep === 1 ? 'bg-white text-[#4d8c6b]' : 'border border-white'}`}>1</span>
              <span>Informasi Pemohon</span>
            </div>
            <div className="h-[1px] w-12 bg-white opacity-50"></div>
            <div className={`flex items-center space-x-1 ${currentStep === 2 ? 'font-semibold' : 'opacity-60'}`}>
              <span className={`rounded-full w-5 h-5 flex items-center justify-center font-bold ${currentStep === 2 ? 'bg-white text-[#4d8c6b]' : 'border border-white'}`}>2</span>
              <span>Detail Barang & Kebutuhan</span>
            </div>
            <div className="h-[1px] w-12 bg-white opacity-50"></div>
            <div className={`flex items-center space-x-1 ${currentStep === 3 ? 'font-semibold' : 'opacity-60'}`}>
              <span className={`rounded-full w-5 h-5 flex items-center justify-center font-bold ${currentStep === 3 ? 'bg-white text-[#4d8c6b]' : 'border border-white'}`}>3</span>
              <span>Review & Submit</span>
            </div>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="w-full max-w-[210mm] flex justify-between items-start mb-6 text-white print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Preview Bon Barang</h1>
            <p className="text-sm opacity-90">Formulir cetak ini berukuran nota fisik (21cm x 16cm)</p>
          </div>
          <div className="flex flex-col space-y-2">
            <button onClick={handleDownloadPDF} disabled={isExporting} className="flex items-center justify-center space-x-2 bg-white text-gray-800 px-4 py-1.5 rounded-lg text-sm font-medium shadow hover:bg-gray-100 transition-colors cursor-pointer">
              <span>{isExporting ? '⏳ Mengunduh...' : '📥 Download PDF'}</span>
            </button>
            <button onClick={() => window.print()} className="flex items-center justify-center space-x-2 bg-white text-gray-800 px-4 py-1.5 rounded-lg text-sm font-medium shadow hover:bg-gray-100 transition-colors cursor-pointer">
              <span>🖨️ Cetak</span>
            </button>
          </div>
        </div>
      )}

      {/* AREA CARD UTAMA FORMULIR */}
      {currentStep <= 3 ? (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-8 text-black">
          {currentStep <= 2 ? (
            <form onSubmit={handleNext}>
              {/* STEP 1: INFORMASI PEMOHON */}
              {currentStep === 1 && (
                <>
                  <h2 className="text-xl font-bold mb-6">Informasi Pemohon</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label><input type="text" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">NIP/ ID pegawai</label><input type="text" name="nipPegawai" value={formData.nipPegawai} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required /></div>
                    
                    {/* Dropdown Unit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select 
                        name="divisi" 
                        value={formData.divisi} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b] cursor-pointer" 
                        required
                      >
                        <option value="" disabled hidden>Pilih Unit</option>
                        <option value="KC Semarang">KC Semarang</option>
                        <option value="KCP Majapahit">KCP Majapahit</option>
                        <option value="KCP Ngaliyan">KCP Ngaliyan</option>
                        <option value="KCP Ungaran">KCP Ungaran</option>
                        <option value="KCP Kendal">KCP Kendal</option>
                        <option value="KCP Kudus">KCP Kudus</option>
                        <option value="KCP Magelang">KCP Magelang</option>
                      </select>
                    </div>
                    
                    {/* PERUBAHAN: Input teks "Jabatan" diganti menjadi Dropdown Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                      <select 
                        name="jabatan" 
                        value={formData.jabatan} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b] cursor-pointer" 
                        required
                      >
                        <option value="" disabled hidden>Pilih Jabatan</option>
                        <option value="Head User">Manager</option>
                        <option value="User">User</option>
                      </select>
                    </div>

                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">No Telephone</label><input type="tel" name="noTelepon" value={formData.noTelepon} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required /></div>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-8">1/3</div>
                </>
              )}

              {/* STEP 2: DETAIL PERMINTAAN */}
              {currentStep === 2 && (
                <>
                  <h2 className="text-xl font-bold mb-4">Daftar Barang yang Diminta</h2>
                  <span className="text-gray-400 text-sm select-none">
                        Silakan pilih barang melalui menu Aset terlebih dahulu...
                  </span>
                  <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-3 mb-6 max-h-[220px] overflow-y-auto">
                    {daftarBarang.map((barang, idx) => (
                      <div key={barang.kodeAset} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-zinc-200 rounded-lg shadow-sm">
                        <div>
                          <div className="text-xs font-bold capitalize text-zinc-800">{barang.namaAset}</div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{barang.kodeAset}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-zinc-600 font-medium">Jumlah:</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={barang.jumlah} 
                            onChange={(e) => handleQtyChange(idx, e.target.value)} 
                            className="w-16 text-center text-xs border border-zinc-300 rounded py-1 px-1.5 focus:outline-[#4d8c6b]"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                      <select name="prioritas" value={formData.prioritas} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer" required>
                        <option value="" disabled hidden>Pilih Prioritas</option>
                        <option value="Rendah">Rendah (🔵)</option>
                        <option value="Sedang">Sedang (🟡)</option>
                        <option value="Tinggi">Tinggi (🔴)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Dibutuhkan</label>
                      <input 
                        type="date" 
                        name="tanggalDibutuhkan" 
                        value={formData.tanggalDibutuhkan} 
                        onChange={handleChange} 
                        min={getTodayDate()} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg" 
                        required 
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Keterangan <span className="text-gray-400 text-xs font-normal">(Opsional)</span>
                      </label>
                      <textarea 
                        name="alasanDibutuhkan" 
                        value={formData.alasanDibutuhkan} 
                        onChange={handleChange} 
                        rows="3" 
                        placeholder="Tambahkan keterangan jika ada..." 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none" 
                      ></textarea>
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-8">2/3</div>
                </>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={handleBack} className="px-6 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium">{currentStep === 2 ? 'Kembali' : 'Batal'}</button>
                <button type="submit" className="px-6 py-2 bg-[#045936] text-white rounded-lg text-sm font-medium">Selanjutnya</button>
              </div>
            </form>
          ) : (
            
            /* STEP 3: REVIEW & SUBMIT */
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-4">Informasi Pemohon</h2>
                <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-y-2 text-sm">
                  <span className="font-medium">Nama Lengkap</span><span>: {formData.namaLengkap}</span>
                  <span className="font-medium">Unit</span><span>: {formData.divisi}</span>
                  <span className="font-medium">Prioritas & Tanggal</span><span>: {formData.prioritas} | {formData.tanggalDibutuhkan}</span>
                  <span className="font-medium">Keterangan</span>
                  <span className="italic text-gray-600">: {formData.alasanDibutuhkan || '-'}</span>
                </div>
              </div>
              <hr className="border-gray-300 my-4" />
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Daftar Aset Berjumlah ({daftarBarang.length})</h2>
                <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-100 font-bold p-2.5 grid grid-cols-[1fr_100px]"><span>Nama Barang</span><span>Kuantitas</span></div>
                  {daftarBarang.map((b) => (
                    <div key={b.kodeAset} className="border-t border-zinc-200 p-2.5 grid grid-cols-[1fr_100px] capitalize">
                      <span>{b.namaAset} ({b.kodeAset})</span>
                      <span className="font-bold">{b.jumlah} Item</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button type="button" onClick={handleBack} className="px-6 py-2 border border-gray-400 text-gray-700 rounded-lg text-sm font-medium">Ubah</button>
                <button type="button" onClick={handleSubmitFinal} className="px-6 py-2 bg-[#045936] text-white rounded-lg text-sm font-medium">Ajukan Permintaan</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 4: PREVIEW DOKUMEN */
        <div className="shadow-2xl print:shadow-none bg-white rounded-lg overflow-hidden">
          <TemplateDokumenA4 ref={printRef} formData={formData} daftarBarang={daftarBarang} />
        </div>
      )}
    </div>
  );
}