import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import TemplateDokumenA4 from './TemplateDokumenA4';
import { supabase } from '../../../../supabaseClient'; 

export default function AjukanPermintaan() {
  const printRef = useRef();

  const savedAssets = JSON.parse(localStorage.getItem('selectedAssetData')) || [];
  const isMultiItem = Array.isArray(savedAssets) && savedAssets.length > 0;

  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingPriority, setIsCheckingPriority] = useState(false);
  
  // State Form Utama
  const [formData, setFormData] = useState({
    namaLengkap: '', nipPegawai: '', divisi: '', jabatan: '', email: '', noTelepon: '',
    tanggalDibutuhkan: '', keperluan: ''
  });

  // State Detail Barang (Items)
  const [daftarBarang, setDaftarBarang] = useState([]);

  useEffect(() => {
    if (isMultiItem) {
      initializeItemsWithAutoPriority(savedAssets);
      localStorage.removeItem('selectedAssetData');
    }

    // Ambil data user yang sedang login dari localStorage
    const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
    
    if (activeUser) {
      const identifier = activeUser.email || activeUser.username || activeUser.namaLengkap;

      // Isi sementara dari localStorage (nama & email dasar)
      setFormData(prev => ({
        ...prev,
        namaLengkap: activeUser.namaLengkap || activeUser.name || activeUser.username || '',
        email: activeUser.email || ''
      }));

      // Sambung ke database Supabase tabel 'user_roles' untuk menarik data lengkap
      fetchUserProfileFromDB(identifier);
    }
  }, [isMultiItem]);

  const fetchUserProfileFromDB = async (identifier) => {
    if (!identifier) return;
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .or(`email.eq.${identifier},username.eq.${identifier}`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          ...prev,
          namaLengkap: data.username || data.email?.split('@')[0] || prev.namaLengkap,
          nipPegawai: data.staff_id || '', 
          divisi: data.unit || '',            
          jabatan: data.role || 'User',       
          email: data.email || prev.email,
        }));
      }
    } catch (err) {
      console.error("Gagal mengambil profil dari database:", err.message);
    }
  };

  const initializeItemsWithAutoPriority = async (assets) => {
    setIsCheckingPriority(true);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const isoOneYearAgo = oneYearAgo.toISOString();

      const processedItems = await Promise.all(assets.map(async (asset) => {
        // 1. Cek frekuensi untuk prioritas otomatis
        const { count, error } = await supabase
          .from('request_items')
          .select('id, created_at', { count: 'exact', head: true })
          .ilike('nama_barang', asset.namaAset)
          .gte('created_at', isoOneYearAgo);

        if (error) throw error;

        // 🔥 2. AMBIL STOK REAL-TIME DARI TABEL MASTER 'items'
        let currentStock = 999; // Default jika gagal membaca
        if (asset.kodeAset) {
          const { data: itemData } = await supabase
            .from('items')
            .select('stock')
            .eq('id', asset.kodeAset)
            .maybeSingle();
            
          if (itemData) {
            currentStock = parseInt(itemData.stock) || 0;
          }
        }

        const frequency = count || 0;
        let calculatedPriority = 'Rendah';

        if (frequency > 50) {
          calculatedPriority = 'Tinggi';
        } else if (frequency >= 20) {
          calculatedPriority = 'Sedang';
        } else {
          calculatedPriority = 'Rendah';
        }

        return {
          namaAset: asset.namaAset,
          kodeAset: asset.kodeAset,
          jumlah: asset.jumlah || 1,
          stokMaksimal: currentStock, // Simpan sisa stok fisik di gudang
          prioritas: calculatedPriority, 
          autoFrequency: frequency,       
          keterangan: '' 
        };
      }));

      setDaftarBarang(processedItems);
    } catch (err) {
      console.error("Gagal menghitung prioritas otomatis:", err.message);
      const fallbackItems = assets.map(asset => ({
        namaAset: asset.namaAset,
        kodeAset: asset.kodeAset,
        jumlah: asset.jumlah || 1,
        stokMaksimal: asset.stock || 999, // Fallback stok
        prioritas: 'Rendah',
        keterangan: ''
      }));
      setDaftarBarang(fallbackItems);
    } finally {
      setIsCheckingPriority(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔥 FUNGSI VALIDASI QTY AGAR TIDAK MELEBIHI STOK
  const handleQtyChange = (index, val) => {
    const updated = [...daftarBarang];
    let inputVal = parseInt(val) || 1;
    const batasStok = updated[index].stokMaksimal;

    // Jika user menginput lebih dari stok yang ada
    if (inputVal > batasStok) {
      inputVal = batasStok; // Paksa kembali ke angka maksimal stok
      alert(`⚠️ Peringatan: Stok barang "${updated[index].namaAset}" di gudang hanya tersisa ${batasStok} unit!`);
    }
    
    // Jangan biarkan angka di bawah 1
    if (inputVal < 1) inputVal = 1;

    updated[index].jumlah = inputVal;
    setDaftarBarang(updated);
  };

  const handleKeteranganItemChange = (index, val) => {
    const updated = [...daftarBarang];
    updated[index].keterangan = val;
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
      
      // Tambahan validasi: pastikan tidak ada barang dengan stok 0 yang diajukan
      const barangHabis = daftarBarang.find(b => b.stokMaksimal === 0);
      if (barangHabis) {
        alert(`Gagal: Stok barang "${barangHabis.namaAset}" sedang kosong (0 unit). Silakan hapus barang tersebut dari daftar pengajuan.`);
        return;
      }
      
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleSubmitFinal = async () => {
    setIsExporting(true); 

    try {
      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomCode = Math.floor(100 + Math.random() * 900);
      const generatedId = `REQ-${dateCode}-${randomCode}`;

      // 1. Simpan data utama request
      const { error: reqError } = await supabase
        .from('requests')
        .insert([
          {
            id: generatedId,
            nama_pemohon: formData.namaLengkap,
            email_pemohon: formData.email,
            unit: formData.divisi,
            tanggal: formData.tanggalDibutuhkan,
            jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            status: 'menunggu',
            keperluan: formData.keperluan || 'Detail per barang',
            is_diserahkan: false
          }
        ]);

      if (reqError) throw reqError;

      // 2. Simpan rincian item barang
      const itemsToInsert = daftarBarang.map(b => ({
        request_id: generatedId, 
        kode_barang: b.kodeAset,
        nama_barang: b.namaAset,
        jumlah_diminta: b.jumlah,
        prioritas: b.prioritas, 
        remark: b.keterangan 
      }));

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // 3. KIRIM NOTIFIKASI SECARA OTOMATIS & DINAMIS KE ADMIN/MANAGER
      try {
        const { data: staffList, error: staffError } = await supabase
          .from('user_roles')
          .select('email, role')
          .in('role', ['admin', 'manager']);

        if (!staffError && staffList && staffList.length > 0) {
          const notificationsToInsert = staffList.map(staff => ({
            user_email: staff.email, 
            title: 'Pengajuan Request Baru',
            message: `${formData.namaLengkap} mengajukan permintaan ${daftarBarang.length} barang.`,
            type: 'request',
            is_read: false
          }));

          await supabase
            .from('notifications')
            .insert(notificationsToInsert);
        }
      } catch (notifError) {
        console.error("Gagal mengirim notifikasi otomatis:", notifError.message);
      }

      setCurrentStep(4);

    } catch (err) {
      console.error("Error Database:", err);
      alert(`Gagal menyimpan data ke database: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);

    const opt = {
      margin:       0,
      filename:     `Bon_Barang_${formData.namaLengkap ? formData.namaLengkap.replace(/\s+/g, '_') : 'BSN'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    }).catch((err) => {
      console.error("Error:", err);
      setIsExporting(false);
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      
      {currentStep <= 3 && (
        <div className="w-full max-w-2xl mb-6 text-white print:hidden">
          <h1 className="text-2xl font-bold">Ajukan Permintaan</h1>
          <p className="text-sm opacity-90">Sistem otomatis menghitung tingkat prioritas berdasarkan frekuensi permintaan tahunan</p>
          
          <div className="flex items-center space-x-4 mt-4 text-xs">
            <div className={`flex items-center space-x-1 ${currentStep === 1 ? 'font-semibold' : 'opacity-60'}`}>
              <span className={`rounded-full w-5 h-5 flex items-center justify-center font-bold ${currentStep === 1 ? 'bg-white text-[#4d8c6b]' : 'border border-white'}`}>1</span>
              <span>Informasi Pemohon</span>
            </div>
            <div className="h-[1px] w-12 bg-white opacity-50"></div>
            <div className={`flex items-center space-x-1 ${currentStep === 2 ? 'font-semibold' : 'opacity-60'}`}>
              <span className={`rounded-full w-5 h-5 flex items-center justify-center font-bold ${currentStep === 2 ? 'bg-white text-[#4d8c6b]' : 'border border-white'}`}>2</span>
              <span>Detail Kebutuhan</span>
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

      {currentStep <= 3 ? (
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-8 text-black">
          {currentStep <= 2 ? (
            <form onSubmit={handleNext}>
              {currentStep === 1 && (
                <>
                  <h2 className="text-xl font-bold mb-6">Informasi Pemohon</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                      <input type="text" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NIP/ ID pegawai</label>
                      <input type="text" name="nipPegawai" value={formData.nipPegawai} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <select name="divisi" value={formData.divisi} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b] cursor-pointer" required>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                      <select name="jabatan" value={formData.jabatan} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b] cursor-pointer" required>
                        <option value="" disabled hidden>Pilih Jabatan</option>
                        <option value="Head Unit">Head Unit</option>
                        <option value="User">User</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">No Telephone</label><input type="tel" name="noTelepon" value={formData.noTelepon} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b]" required /></div>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-8">1/3</div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">Detail Daftar Barang</h2>
                    <div className="w-full sm:w-auto">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Dibutuhkan</label>
                      <input type="date" name="tanggalDibutuhkan" value={formData.tanggalDibutuhkan} onChange={handleChange} min={getTodayDate()} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b] text-sm" required />
                    </div>
                  </div>
                  
                  {isCheckingPriority ? (
                    <div className="py-12 text-center text-zinc-400 text-xs animate-pulse">
                      ⚡ Menghubungkan database dan mengecek ketersediaan stok gudang...
                    </div>
                  ) : (
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-4 mb-6 max-h-[350px] overflow-y-auto">
                      {daftarBarang.map((barang, idx) => (
                        <div key={barang.kodeAset} className="flex flex-col gap-3 p-3 bg-white border border-zinc-200 rounded-lg shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                            <div>
                              <div className="text-sm font-bold capitalize text-zinc-800">{barang.namaAset}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                ID: {barang.kodeAset}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-1.5 hidden sm:flex">
                                <span className="text-xs text-zinc-500 font-medium">Prioritas:</span>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-black border ${
                                  barang.prioritas === 'Tinggi' ? 'bg-red-50 text-red-600 border-red-200' : 
                                  barang.prioritas === 'Sedang' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 
                                  'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                  {barang.prioritas}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-lg border border-zinc-200">
                                <label className="text-xs text-zinc-600 font-medium ml-1">Kuantitas:</label>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max={barang.stokMaksimal} // 🔥 BATAS MAKSIMAL HTML
                                  value={barang.jumlah} 
                                  onChange={(e) => handleQtyChange(idx, e.target.value)} 
                                  className={`w-16 text-center text-xs border rounded py-1 px-1.5 focus:outline-[#4d8c6b] ${barang.stokMaksimal === 0 ? 'bg-red-50 border-red-300' : 'border-zinc-300'}`}
                                  required
                                  disabled={barang.stokMaksimal === 0}
                                />
                                {/* 🔥 INFO SISA STOK */}
                                <span className={`text-[10px] font-bold ${barang.stokMaksimal === 0 ? 'text-red-500' : 'text-zinc-500'} pr-1`}>
                                  / {barang.stokMaksimal} Stok
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Alasan Permintaan Barang Ini:</label>
                            <input 
                              type="text" 
                              placeholder="Contoh: Stok alat tulis habis..." 
                              value={barang.keterangan || ''}
                              onChange={(e) => handleKeteranganItemChange(idx, e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded bg-gray-50 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#4d8c6b]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center text-xs text-gray-500 mt-8">2/3</div>
                </>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={handleBack} className="px-6 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium">{currentStep === 2 ? 'Kembali' : 'Batal'}</button>
                <button type="submit" disabled={isCheckingPriority} className="px-6 py-2 bg-[#045936] text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">Selanjutnya</button>
              </div>
            </form>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-4">Review Permintaan</h2>
                <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-y-2 text-sm">
                  <span className="font-medium text-zinc-500">Nama Lengkap</span><span className="font-bold">: {formData.namaLengkap}</span>
                  <span className="font-medium text-zinc-500">Unit</span><span>: {formData.divisi}</span>
                  <span className="font-medium text-zinc-500">Tanggal Dibutuhkan</span><span>: {formData.tanggalDibutuhkan}</span>
                </div>
              </div>
              <hr className="border-gray-300 my-4" />
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Rincian Per Barang ({daftarBarang.length})</h2>
                <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-zinc-100 font-bold p-2.5 grid grid-cols-[1fr_100px]"><span>Nama Barang & Keterangan</span><span>Kuantitas</span></div>
                  {daftarBarang.map((b) => (
                    <div key={b.kodeAset} className="border-t border-zinc-200 p-3 flex justify-between items-start capitalize">
                      <div>
                        <span className="block font-bold text-sm text-zinc-800">{b.namaAset}</span>
                        <span className="text-[10px] text-zinc-400 font-mono block mb-1">ID: {b.kodeAset}</span>
                        <div className="text-[10px] text-gray-600 mt-1.5 flex flex-col gap-0.5">
                          <span>
                            <span className="font-bold text-gray-500">Prioritas (Otomatis Sistem):</span>{' '}
                            <span className={`font-bold ${
                              b.prioritas === 'Tinggi' ? 'text-red-600' : 
                              b.prioritas === 'Sedang' ? 'text-yellow-600' : 
                              'text-gray-600'
                            }`}>
                              {b.prioritas} (Frekuensi: {b.autoFrequency}x/tahun)
                            </span>
                          </span>
                          <span><span className="font-bold text-gray-500">Alasan:</span> <span className="italic">{b.keterangan || '-'}</span></span>
                        </div>
                      </div>
                      <span className="font-black text-sm text-[#00664b] whitespace-nowrap mt-1">{b.jumlah} Item</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button type="button" onClick={handleBack} className="px-6 py-2 border border-gray-400 text-gray-700 rounded-lg text-sm font-medium cursor-pointer">Ubah</button>
                <button 
                  type="button" 
                  onClick={handleSubmitFinal} 
                  disabled={isExporting}
                  className="px-6 py-2 bg-[#045936] text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? 'Memproses ke Database...' : 'Ajukan Permintaan Sekarang'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="shadow-2xl print:shadow-none bg-white rounded-lg overflow-hidden">
          <TemplateDokumenA4 ref={printRef} formData={formData} daftarBarang={daftarBarang} />
        </div>
      )}
    </div>
  );
}