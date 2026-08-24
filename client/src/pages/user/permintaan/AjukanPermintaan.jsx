import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, X as CloseIcon, CheckSquare, MoreVertical, Download, 
  User, Shield, Briefcase, Building, Users 
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import TemplateDokumenA4 from './TemplateDokumenA4';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';

export default function AjukanPermintaan() {
  const printRef = useRef();

  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingPriority, setIsCheckingPriority] = useState(false);
  
  // State Form Utama
  const [formData, setFormData] = useState({
    namaLengkap: '', nipPegawai: '', divisi: '', jabatan: '', email: '', unitKerja: '',
    tanggalDibutuhkan: '', keperluan: ''
  });

  // State Detail Barang (Items)
  const [daftarBarang, setDaftarBarang] = useState([]);

  // ==========================================
  // 🔥 LOAD DRAFT & HANDLE BARANG DARI KATALOG
  // ==========================================
  useEffect(() => {
    const draftStr = localStorage.getItem('draft_ajukan_permintaan');
    const draftData = draftStr ? JSON.parse(draftStr) : null;
    
    const savedAssetsStr = localStorage.getItem('selectedAssetData');
    const newAssetsFromCatalog = savedAssetsStr ? JSON.parse(savedAssetsStr) : [];
    const hasNewAssets = Array.isArray(newAssetsFromCatalog) && newAssetsFromCatalog.length > 0;

    const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession')) || {};
    const identifier = activeUser?.email || activeUser?.username || activeUser?.namaLengkap;

    // PENGAMANAN: Pastikan data diri (identitas) SELALU ADA dan tidak ketimpa draft kosong
    const baseProfileData = {
      namaLengkap: activeUser.namaLengkap || activeUser.name || activeUser.username || '',
      email: activeUser.email || '', // Tetap disimpan di background untuk database
      nipPegawai: activeUser.nip || activeUser.staff_id || '',
      divisi: activeUser.unit || activeUser.divisi || '',
      jabatan: activeUser.role || activeUser.jabatan || '',
      unitKerja: activeUser.unit_kerja || activeUser.unitKerja || ''
    };

    if (draftData && draftData.formData) {
      setFormData({
        ...draftData.formData,
        // Paksa timpa dengan identitas asli agar tidak pernah kosong
        namaLengkap: draftData.formData.namaLengkap || baseProfileData.namaLengkap,
        email: draftData.formData.email || baseProfileData.email,
        nipPegawai: draftData.formData.nipPegawai || baseProfileData.nipPegawai,
        divisi: draftData.formData.divisi || baseProfileData.divisi,
        jabatan: draftData.formData.jabatan || baseProfileData.jabatan,
        unitKerja: draftData.formData.unitKerja || baseProfileData.unitKerja,
      });
    } else {
      setFormData(prev => ({ ...prev, ...baseProfileData }));
    }

    if (identifier) fetchUserProfileFromDB(identifier);

    // Setup Step & Gabungkan Barang
    let existingItems = draftData && draftData.daftarBarang ? draftData.daftarBarang : [];

    if (hasNewAssets) {
      // Jika bawa barang baru dari katalog, otomatis lompat ke Step 2 & Gabungkan
      setCurrentStep(2);
      initializeItemsWithAutoPriority(newAssetsFromCatalog, existingItems);
      localStorage.removeItem('selectedAssetData'); 
    } else {
      setDaftarBarang(existingItems);
      if (draftData && draftData.currentStep) {
        setCurrentStep(draftData.currentStep);
      }
    }
  }, []);

  // ==========================================
  // 🔥 AUTO-SAVE DRAFT (Setiap Ada Perubahan)
  // ==========================================
  useEffect(() => {
    // Jangan save kalau formData nama masih kosong!
    if (currentStep <= 3 && formData.namaLengkap) {
      const draftToSave = {
        currentStep,
        formData,
        daftarBarang
      };
      localStorage.setItem('draft_ajukan_permintaan', JSON.stringify(draftToSave));
    }
  }, [currentStep, formData, daftarBarang]);


  const fetchUserProfileFromDB = async (identifier) => {
    if (!identifier) return;
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .or(`email.eq.${identifier},username.eq.${identifier}`)
        .maybeSingle();

      if (data && !error) {
        setFormData(prev => ({
          ...prev,
          namaLengkap: data.username || data.name || data.nama_lengkap || data.email?.split('@')[0] || prev.namaLengkap,
          nipPegawai: data.staff_id || data.nip || prev.nipPegawai, 
          divisi: data.unit || data.divisi || prev.divisi,            
          jabatan: data.role || data.jabatan || prev.jabatan,       
          email: data.email || prev.email,
          unitKerja: data.unit_kerja || prev.unitKerja
        }));
      }
    } catch (err) {
      console.error("Gagal mengambil profil dari database:", err.message);
    }
  };

  const initializeItemsWithAutoPriority = async (newAssets, existingItems = []) => {
    setIsCheckingPriority(true);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const isoOneYearAgo = oneYearAgo.toISOString();

      const processedNewItems = await Promise.all(newAssets.map(async (asset) => {
        const { count, error } = await supabase
          .from('request_items')
          .select('id, created_at', { count: 'exact', head: true })
          .ilike('nama_barang', asset.namaAset)
          .gte('created_at', isoOneYearAgo);

        if (error) throw error;

        let currentStock = 999;
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
          stokMaksimal: currentStock, 
          prioritas: calculatedPriority, 
          autoFrequency: frequency,       
          keterangan: '' 
        };
      }));

      const combined = [...existingItems];
      processedNewItems.forEach(newItem => {
        const existsIdx = combined.findIndex(item => item.kodeAset === newItem.kodeAset);
        if (existsIdx >= 0) {
          const newQty = combined[existsIdx].jumlah + newItem.jumlah;
          combined[existsIdx].jumlah = Math.min(newQty, combined[existsIdx].stokMaksimal);
        } else {
          combined.push(newItem);
        }
      });

      setDaftarBarang(combined);
    } catch (err) {
      console.error("Gagal menghitung prioritas otomatis:", err.message);
      const combined = [...existingItems];
      newAssets.forEach(asset => {
        const existsIdx = combined.findIndex(item => item.kodeAset === asset.kodeAset);
        if (existsIdx >= 0) {
          combined[existsIdx].jumlah += (asset.jumlah || 1);
        } else {
          combined.push({
            namaAset: asset.namaAset,
            kodeAset: asset.kodeAset,
            jumlah: asset.jumlah || 1,
            stokMaksimal: asset.stock || 999, 
            prioritas: 'Rendah',
            keterangan: ''
          });
        }
      });
      setDaftarBarang(combined);
    } finally {
      setIsCheckingPriority(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQtyChange = (index, val) => {
    const updated = [...daftarBarang];
    const batasStok = updated[index].stokMaksimal;

    if (val === '') {
      updated[index].jumlah = '';
      setDaftarBarang(updated);
      return;
    }

    let inputVal = parseInt(val, 10);

    if (isNaN(inputVal)) {
      updated[index].jumlah = '';
      setDaftarBarang(updated);
      return;
    }

    if (inputVal > batasStok) {
      inputVal = batasStok; 
      toast.error(`Stok barang "${updated[index].namaAset}" di gudang hanya tersisa ${batasStok} unit!`);
    }

    updated[index].jumlah = inputVal;
    setDaftarBarang(updated);
  };

  const handleQtyBlur = (index) => {
    const updated = [...daftarBarang];
    if (!updated[index].jumlah || updated[index].jumlah < 1) {
      updated[index].jumlah = 1;
      setDaftarBarang(updated);
    }
  };

  const handleKeteranganItemChange = (index, val) => {
    const updated = [...daftarBarang];
    updated[index].keterangan = val;
    setDaftarBarang(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = [...daftarBarang];
    updated.splice(index, 1);
    setDaftarBarang(updated);
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (currentStep === 1) setCurrentStep(2);
    else if (currentStep === 2) {
      if (daftarBarang.length === 0) {
        toast.error("Belum ada barang yang diajukan. Silakan pilih kembali dari katalog.");
        return;
      }
      
      const barangHabis = daftarBarang.find(b => b.stokMaksimal === 0);
      if (barangHabis) {
        toast.error(`Stok barang "${barangHabis.namaAset}" sedang kosong (0 unit). Silakan hapus barang tersebut dari daftar pengajuan.`);
        return;
      }

      const isAnyQtyEmpty = daftarBarang.some(b => !b.jumlah || b.jumlah < 1);
      if (isAnyQtyEmpty) {
        toast.error("Silakan periksa kembali jumlah barang yang diajukan, tidak boleh kosong atau 0.");
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
    const toastId = toast.loading('Mengirim pengajuan ke database...');

    try {
      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomCode = Math.floor(100 + Math.random() * 900);
      const generatedId = `REQ-${dateCode}-${randomCode}`;

      const { error: reqError } = await supabase
        .from('requests')
        .insert([
          {
            id: generatedId,
            nama_pemohon: formData.namaLengkap,
            email_pemohon: formData.email, // Email dikirim ke database saja, tidak tampil di UI
            unit: formData.divisi,
            tanggal: formData.tanggalDibutuhkan,
            jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            status: 'menunggu',
            keperluan: formData.keperluan || 'Detail per barang',
            is_diserahkan: false
          }
        ]);

      if (reqError) throw reqError;

      const itemsToInsert = daftarBarang.map(b => ({
        request_id: generatedId, 
        kode_barang: b.kodeAset,
        nama_barang: b.namaAset,
        jumlah_diminta: Number(b.jumlah) || 1,
        prioritas: b.prioritas, 
        remark: b.keterangan 
      }));

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

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

      toast.success('Pengajuan permintaan berhasil dikirim!', { id: toastId });
      
      // Penghapusan draft karena sudah sukses tersimpan
      localStorage.removeItem('draft_ajukan_permintaan');
      setCurrentStep(4);

    } catch (err) {
      console.error("Error Database:", err);
      toast.error(`Gagal menyimpan data ke database: ${err.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);

    const toastId = toast.loading('Menyiapkan file PDF...');

    const opt = {
      margin:       0,
      filename:     `Bon_Barang_${formData.namaLengkap ? formData.namaLengkap.replace(/\s+/g, '_') : 'BSN'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
      toast.success('PDF berhasil diunduh!', { id: toastId });
    }).catch((err) => {
      console.error("Error:", err);
      setIsExporting(false);
      toast.error('Gagal mengunduh PDF.', { id: toastId });
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
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-300">
      
      {currentStep <= 3 && (
        <div className="w-full max-w-2xl mb-6 text-white print:hidden">
          <h1 className="text-2xl font-bold">Ajukan Permintaan</h1>
          <p className="text-sm opacity-90">Sistem otomatis menyimpan draft Anda dan menghitung prioritas</p>
          
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
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-8 text-black relative">
          
          {currentStep <= 2 ? (
            <form onSubmit={handleNext}>
              {currentStep === 1 && (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Informasi Pemohon</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Nama Lengkap</label>
                      <div className="relative flex items-center">
                        <User size={16} className="absolute left-3 text-zinc-400" />
                        <input type="text" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white font-medium text-zinc-800 transition-colors" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">NIP / ID Pegawai</label>
                      <div className="relative flex items-center">
                        <Shield size={16} className="absolute left-3 text-zinc-400" />
                        <input type="text" name="nipPegawai" value={formData.nipPegawai} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 font-medium cursor-not-allowed" readOnly required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Jabatan</label>
                      <div className="relative flex items-center">
                        <Briefcase size={16} className="absolute left-3 text-zinc-400" />
                        <input type="text" name="jabatan" value={formData.jabatan} readOnly className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 font-medium capitalize cursor-not-allowed" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Cabang Tujuan</label>
                      <div className="relative flex items-center">
                        <Building size={16} className="absolute left-3 text-zinc-400 z-10 pointer-events-none" />
                        <select name="divisi" value={formData.divisi} onChange={handleChange} className="w-full pl-10 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white font-medium text-zinc-800 transition-colors cursor-pointer appearance-none" required>
                          <option value="" disabled hidden>Pilih Cabang Tujuan</option>
                          <option value="KC Semarang">KC Semarang</option>
                          <option value="KCP Majapahit">KCP Majapahit</option>
                          <option value="KCP Ngaliyan">KCP Ngaliyan</option>
                          <option value="KCP Ungaran">KCP Ungaran</option>
                          <option value="KCP Kendal">KCP Kendal</option>
                          <option value="KCP Kudus">KCP Kudus</option>
                          <option value="KCP Magelang">KCP Magelang</option>
                          {!["KC Semarang", "KCP Majapahit", "KCP Ngaliyan", "KCP Ungaran", "KCP Kendal", "KCP Kudus", "KCP Magelang", ""].includes(formData.divisi) && (
                            <option value={formData.divisi}>{formData.divisi}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Unit Kerja</label>
                      <div className="relative flex items-center">
                        <Users size={16} className="absolute left-3 text-zinc-400 z-10 pointer-events-none" />
                        <select name="unitKerja" value={formData.unitKerja} onChange={handleChange} className="w-full pl-10 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white font-medium text-zinc-800 transition-colors cursor-pointer appearance-none" required>
                          <option value="" disabled hidden>Pilih Unit Kerja</option>
                          <option value="CWO">CWO</option>
                          <option value="FA & FD">FA & FD</option>
                          <option value="Accounting">Accounting</option>
                          <option value="Operasional">Operasional</option>
                          <option value="Teller">Teller</option>
                          <option value="FS">FS</option>
                          <option value="CS">CS</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Sekretaris">Sekretaris</option>
                          <option value="Funding">Funding</option>
                          <option value="Consumer">Consumer</option>
                          {formData.unitKerja && !["CWO", "FA & FD", "Accounting", "Operasional", "Teller", "FS", "CS", "Commercial", "Sekretaris", "Funding", "Consumer", ""].includes(formData.unitKerja) && (
                            <option value={formData.unitKerja}>{formData.unitKerja}</option>
                          )}
                        </select>
                      </div>
                    </div>

                  </div>
                  <div className="text-center text-xs text-gray-500 mt-8">1/3</div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">Detail Daftar Barang</h2>
                      <span className="bg-[#e7f0ec] text-[#00664b] px-2.5 py-0.5 rounded-full text-[10px] font-bold">Draft Tersimpan</span>
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <div className="w-full sm:w-auto">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Tanggal Dibutuhkan</label>
                        <input type="date" name="tanggalDibutuhkan" value={formData.tanggalDibutuhkan} onChange={handleChange} min={getTodayDate()} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4d8c6b] text-sm font-semibold" required />
                      </div>
                    </div>
                  </div>
                  
                  {isCheckingPriority ? (
                    <div className="py-12 text-center text-zinc-400 text-xs animate-pulse">
                      ⚡ Menghubungkan database dan mengecek ketersediaan stok gudang...
                    </div>
                  ) : (
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-4 mb-6 max-h-[350px] overflow-y-auto relative">
                      {daftarBarang.map((barang, idx) => (
                        <div key={barang.kodeAset} className="flex flex-col gap-3 p-3 bg-white border border-zinc-200 rounded-lg shadow-sm relative group">
                          
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="absolute -top-2 -right-2 bg-white text-zinc-300 hover:text-red-500 rounded-full cursor-pointer transition-colors shadow-sm border border-zinc-100"
                            title="Hapus barang ini dari daftar"
                          >
                            <CloseIcon size={20} />
                          </button>

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
                                  max={barang.stokMaksimal}
                                  value={barang.jumlah} 
                                  onChange={(e) => handleQtyChange(idx, e.target.value)} 
                                  onBlur={() => handleQtyBlur(idx)}
                                  className={`w-16 text-center text-xs border rounded py-1 px-1.5 focus:outline-[#4d8c6b] ${barang.stokMaksimal === 0 ? 'bg-red-50 border-red-300' : 'border-zinc-300'} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                  required
                                  disabled={barang.stokMaksimal === 0}
                                />
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

              <div className="flex justify-end space-x-4 mt-6 border-t border-zinc-100 pt-6">
                {currentStep > 1 && (
                  <button type="button" onClick={handleBack} className="px-6 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer transition-colors">
                    Kembali
                  </button>
                )}
                <button type="submit" disabled={isCheckingPriority} className="px-6 py-2 bg-[#045936] text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 hover:bg-[#034d2f] transition-colors shadow-md">
                  Selanjutnya
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-4">Review Permintaan</h2>
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-100 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="col-span-2 md:col-span-4">
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Nama Lengkap</span>
                    <span className="text-zinc-900 font-bold text-sm">{formData.namaLengkap}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">ID Pegawai</span>
                    <span className="text-zinc-900 font-bold text-sm">{formData.nipPegawai}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Jabatan</span>
                    <span className="text-zinc-900 font-bold text-sm">{formData.jabatan}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Unit Kerja</span>
                    <span className="text-zinc-900 font-bold text-sm">{formData.unitKerja || '-'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Cabang Tujuan</span>
                    <span className="text-zinc-900 font-bold text-sm">{formData.divisi}</span>
                  </div>
                  <div className="col-span-2 md:col-span-4 pt-3 border-t border-zinc-200/60 mt-2">
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Tanggal Dibutuhkan</span>
                    <span className="text-[#00664b] font-black text-sm">{formData.tanggalDibutuhkan}</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3">Rincian Per Barang ({daftarBarang.length})</h2>
                <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs shadow-sm">
                  <div className="bg-zinc-100 font-bold p-2.5 grid grid-cols-[1fr_100px]"><span>Nama Barang & Keterangan</span><span>Kuantitas</span></div>
                  {daftarBarang.map((b) => (
                    <div key={b.kodeAset} className="border-t border-zinc-200 p-3 flex justify-between items-start capitalize bg-white">
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
              <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-zinc-100">
                <button type="button" onClick={handleBack} className="px-6 py-2 border border-gray-400 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-zinc-50 transition-colors">Ubah</button>
                <button 
                  type="button" 
                  onClick={handleSubmitFinal} 
                  disabled={isExporting}
                  className="px-6 py-2 bg-[#045936] text-white rounded-lg text-sm font-bold cursor-pointer disabled:opacity-50 hover:bg-[#034d2f] transition-colors shadow-md flex gap-2 items-center"
                >
                  {isExporting ? 'Memproses ke Database...' : <><CheckSquare size={18} /> Ajukan Permintaan Sekarang</>}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="shadow-2xl print:shadow-none bg-white rounded-lg overflow-hidden flex justify-center w-full">
          <TemplateDokumenA4 ref={printRef} formData={formData} daftarBarang={daftarBarang} />
        </div>
      )}
    </div>
  );
}