import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Send, Trash2, FileText, Download, Printer, PackageX, Check } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import TemplateDokumenA4 from './TemplateDokumenA4';
import { supabase } from '../../../../supabaseClient';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, label: 'Informasi Pemohon' },
  { id: 2, label: 'Detail Permintaan' },
  { id: 3, label: 'Review & Submit' },
];

// 🔥 Ambang batas frekuensi permintaan barang -> prioritas otomatis
const BATAS_SEDANG = 20;
const BATAS_TINGGI = 35;

function hitungPrioritas(count) {
  if (count >= BATAS_TINGGI) return 'Tinggi';
  if (count >= BATAS_SEDANG) return 'Sedang';
  return 'Rendah';
}

function InfoField({ label, value, capitalize }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className={`w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm font-semibold text-zinc-700 ${capitalize ? 'capitalize' : ''}`}>
        {value || '-'}
      </div>
    </div>
  );
}

export default function AjukanPermintaan({ setCurrentView }) {
  const printRef = useRef();

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({});
  const [tanggalDibutuhkan, setTanggalDibutuhkan] = useState('');
  const [daftarBarang, setDaftarBarang] = useState([]);
  const [loadingBarang, setLoadingBarang] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession')) || {};
    setProfile(activeUser);
    loadCart();
  }, []);

  // Ambil keranjang (hasil pilihan dari halaman Aset), lengkapi stok terkini & prioritas otomatis
  const loadCart = async () => {
    setLoadingBarang(true);
    try {
      const savedCart = localStorage.getItem('selectedAssetData');
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      const cartItems = Array.isArray(parsed) ? parsed : [];

      if (cartItems.length === 0) {
        setDaftarBarang([]);
        return;
      }

      const kodeList = cartItems.map(i => i.kodeAset);

      const { data: itemsData } = await supabase
        .from('items')
        .select('id, stock')
        .in('id', kodeList);

      const enriched = await Promise.all(cartItems.map(async (item) => {
        const { count } = await supabase
          .from('request_items')
          .select('*', { count: 'exact', head: true })
          .eq('kode_barang', item.kodeAset);

        const stokItem = itemsData?.find(it => it.id === item.kodeAset);
        const frekuensi = count || 0;

        return {
          kodeAset: item.kodeAset,
          namaAset: item.namaAset,
          jumlahDiminta: item.jumlah || 1,
          stokTersedia: stokItem?.stock ?? 0,
          frekuensi,
          prioritas: hitungPrioritas(frekuensi),
          alasan: item.alasan || ''
        };
      }));

      setDaftarBarang(enriched);
    } catch (error) {
      console.error('Gagal memuat daftar barang:', error.message);
      toast.error('Gagal memuat daftar barang permintaan!');
    } finally {
      setLoadingBarang(false);
    }
  };

  // Simpan perubahan (jumlah/alasan) balik ke localStorage biar tetap sinkron
  const persistCart = (items) => {
    localStorage.setItem('selectedAssetData', JSON.stringify(
      items.map(item => ({ kodeAset: item.kodeAset, namaAset: item.namaAset, jumlah: item.jumlahDiminta, alasan: item.alasan }))
    ));
  };

  const handleQtyChange = (kodeAset, value) => {
    setDaftarBarang(prev => {
      const updated = prev.map(item => {
        if (item.kodeAset !== kodeAset) return item;
        let val = parseInt(value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (item.stokTersedia > 0 && val > item.stokTersedia) val = item.stokTersedia;
        return { ...item, jumlahDiminta: val };
      });
      persistCart(updated);
      return updated;
    });
  };

  const handleAlasanChange = (kodeAset, value) => {
    setDaftarBarang(prev => {
      const updated = prev.map(item => item.kodeAset === kodeAset ? { ...item, alasan: value } : item);
      persistCart(updated);
      return updated;
    });
  };

  const handleRemoveItem = (kodeAset) => {
    setDaftarBarang(prev => {
      const updated = prev.filter(item => item.kodeAset !== kodeAset);
      persistCart(updated);
      return updated;
    });
    toast.success('Barang dihapus dari daftar permintaan.');
  };

  const goToStep2 = () => {
    if (daftarBarang.length === 0) {
      toast.error('Daftar barang masih kosong. Silakan pilih barang dari Inventory terlebih dahulu!');
      return;
    }
    setStep(2);
  };

  const goToStep3 = () => {
    if (!tanggalDibutuhkan) {
      toast.error('Tanggal dibutuhkan wajib diisi!');
      return;
    }
    setStep(3);
  };

  // Generate ID permintaan format REQ-YYYYMMDD-XXX, konsisten dengan pola ID barang (BRG-...)
  const generateRequestId = async () => {
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const idPrefix = `REQ-${dateCode}-`;

    const { data: lastRequests, error } = await supabase
      .from('requests')
      .select('id')
      .ilike('id', `${idPrefix}%`)
      .order('id', { ascending: false })
      .limit(1);

    if (error) throw new Error(`Gagal generate ID permintaan: ${error.message}`);

    let nextSequence = 1;
    if (lastRequests && lastRequests.length > 0) {
      const lastThreeDigits = lastRequests[0].id.split('-').pop();
      const lastNumber = parseInt(lastThreeDigits, 10);
      if (!isNaN(lastNumber)) nextSequence = lastNumber + 1;
    }

    return `${idPrefix}${String(nextSequence).padStart(3, '0')}`;
  };

  const handleSubmit = async () => {
    if (!profile?.email) {
      toast.error('Sesi pengguna tidak ditemukan. Silakan login ulang.');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Mengirim permintaan...');
    let requestId = null;

    try {
      requestId = await generateRequestId();
      const now = new Date();

      const { error: reqError } = await supabase
        .from('requests')
        .insert([{
          id: requestId,
          tanggal: now.toLocaleDateString('id-ID'),
          jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          status: 'Menunggu',
          nama_pemohon: profile.namaLengkap || profile.username || '-',
          email_pemohon: profile.email,
          unit: profile.divisi || '-',
          keperluan: daftarBarang.map(i => i.alasan).filter(Boolean).join(' | ') || '-',
          tanggal_dibutuhkan: tanggalDibutuhkan,
          is_diserahkan: false
        }]);

      if (reqError) throw new Error(`Gagal menyimpan permintaan: ${reqError.message}`);

      const itemsPayload = daftarBarang.map(item => ({
        request_id: requestId,
        kode_barang: item.kodeAset,
        nama_barang: item.namaAset,
        jumlah_diminta: item.jumlahDiminta,
        prioritas: item.prioritas,
        alasan: item.alasan,
        is_received: false
      }));

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(itemsPayload);

      if (itemsError) {
        await supabase.from('requests').delete().eq('id', requestId);
        throw new Error(`Gagal menyimpan rincian barang: ${itemsError.message}`);
      }

      localStorage.removeItem('selectedAssetData');
      toast.success(`Permintaan ${requestId} berhasil diajukan!`, { id: toastId });

      setSubmittedData({
        requestId,
        formData: {
          divisi: profile.divisi || '-',
          alasanDibutuhkan: daftarBarang.map(i => i.alasan).filter(Boolean).join('; '),
          namaLengkap: profile.namaLengkap || '-',
        },
        items: daftarBarang.map(item => ({
          namaAset: item.namaAset,
          jumlahDiminta: item.jumlahDiminta,
          keterangan: item.alasan
        }))
      });

      setStep(4);

    } catch (error) {
      console.error('Gagal mengajukan permintaan:', error.message);
      toast.error(error.message || 'Terjadi kesalahan saat mengirim permintaan.', { id: toastId, duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);
    const toastId = toast.loading('Menyiapkan file PDF...');

    const opt = {
      margin: 0,
      filename: `Bon_Barang_${submittedData?.requestId || 'BSN'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
      toast.success('PDF berhasil diunduh!', { id: toastId });
    }).catch((err) => {
      console.error('Error:', err);
      setIsExporting(false);
      toast.error('Gagal mengunduh PDF.', { id: toastId });
    });
  };

  const handleCetak = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);
    const toastId = toast.loading('Menyiapkan cetak...');

    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).outputPdf('bloburl').then((url) => {
      setIsExporting(false);
      toast.dismiss(toastId);
      window.open(url, '_blank');
    }).catch((err) => {
      console.error('Error:', err);
      setIsExporting(false);
      toast.error('Gagal menyiapkan cetak.', { id: toastId });
    });
  };

  const handleSelesai = () => {
    if (setCurrentView) setCurrentView('riwayat-permintaan');
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800 px-2 md:px-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Ajukan Permintaan</h2>
        <p className="text-xs text-white font-normal mt-0.5">Isi formulir untuk mengajukan permintaan aset kantor.</p>
      </div>

      {/* STEPPER */}
      {step <= 3 && (
        <div className="flex items-center justify-center gap-2 md:gap-4 py-1 flex-wrap">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0 ${
                  step === s.id ? 'bg-white text-[#00664b]' : step > s.id ? 'bg-emerald-300 text-[#00664b]' : 'bg-white/20 text-white'
                }`}>
                  {step > s.id ? <Check size={12} /> : s.id}
                </div>
                <span className={`text-[10px] md:text-xs font-semibold ${step === s.id ? 'text-white' : 'text-white/60'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && <div className="w-6 md:w-12 h-px bg-white/30" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* STEP 1: INFORMASI PEMOHON (AUTO-FILL DARI PROFIL) */}
      {step === 1 && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm p-4 md:p-6">
          <h3 className="text-base font-bold text-zinc-900 mb-4">Informasi Pemohon</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Nama Lengkap" value={profile.namaLengkap} capitalize />
            <InfoField label="NIP / ID Pegawai" value={profile.nipPegawai} />
            <InfoField label="Unit" value={profile.divisi} />
            <InfoField label="Jabatan" value={profile.jabatan} capitalize />
            <InfoField label="Email" value={profile.email} />
            <InfoField label="No Telephone" value={profile.noTelepon} />
          </div>
          <p className="text-[11px] text-zinc-400 mt-3">Data di atas otomatis diambil dari profil akun kamu. Kalau ada yang salah, perbarui dulu lewat menu Edit Profil.</p>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-400">1/3</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCurrentView && setCurrentView('dashboard')} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Batal</button>
              <button type="button" onClick={goToStep2} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer">
                Selanjutnya <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DETAIL PERMINTAAN */}
      {step === 2 && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-zinc-900">Detail Daftar Barang</h3>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Tanggal Dibutuhkan</label>
              <input
                type="date"
                required
                value={tanggalDibutuhkan}
                onChange={(e) => setTanggalDibutuhkan(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#00664b]"
              />
            </div>
          </div>

          {loadingBarang ? (
            <div className="p-10 text-center text-xs text-zinc-400">Memuat daftar barang...</div>
          ) : daftarBarang.length === 0 ? (
            <div className="p-10 text-center bg-zinc-50 border border-dashed border-zinc-300 rounded-xl">
              <PackageX className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-sm font-semibold text-zinc-500">Belum ada barang dipilih.</p>
              <button type="button" onClick={() => setCurrentView && setCurrentView('aset')} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#00664b] hover:bg-[#004d38] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Pilih Barang dari Inventory
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {daftarBarang.map((item) => (
                <div key={item.kodeAset} className="border border-zinc-200 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-zinc-900 capitalize">{item.namaAset}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">ID: {item.kodeAset}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        item.prioritas === 'Tinggi' ? 'bg-red-50 text-red-600 border-red-200' :
                        item.prioritas === 'Sedang' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        Prioritas: {item.prioritas}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">Kuantitas</span>
                        <input
                          type="number"
                          min={1}
                          max={item.stokTersedia || undefined}
                          value={item.jumlahDiminta}
                          onChange={(e) => handleQtyChange(item.kodeAset, e.target.value)}
                          className="w-14 px-2 py-1 text-center bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#00664b]"
                        />
                        <span className="text-[11px] text-zinc-400">/ {item.stokTersedia} Unit</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveItem(item.kodeAset)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] font-bold text-zinc-500 mb-1">Alasan Permintaan Barang Ini</label>
                    <textarea
                      rows={2}
                      value={item.alasan}
                      onChange={(e) => handleAlasanChange(item.kodeAset, e.target.value)}
                      placeholder="Contoh: Alat tulis habis / rusak..."
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-[#00664b] focus:bg-white resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-400">2/3</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Batal</button>
              <button type="button" onClick={goToStep3} disabled={daftarBarang.length === 0} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
                Selanjutnya <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & SUBMIT */}
      {step === 3 && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm p-4 md:p-6">
          <h3 className="text-base font-bold text-zinc-900 mb-4">Review Permintaan</h3>

          <div className="space-y-1.5 text-sm mb-5">
            <div className="flex"><span className="w-36 text-zinc-500">Nama Lengkap</span><span className="font-semibold text-zinc-800">: {profile.namaLengkap || '-'}</span></div>
            <div className="flex"><span className="w-36 text-zinc-500">Unit</span><span className="font-semibold text-zinc-800">: {profile.divisi || '-'}</span></div>
            <div className="flex"><span className="w-36 text-zinc-500">Tanggal Dibutuhkan</span><span className="font-semibold text-zinc-800">: {tanggalDibutuhkan ? new Date(tanggalDibutuhkan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span></div>
          </div>

          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Rincian Barang ({daftarBarang.length})</h4>
          <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100">
            {daftarBarang.map((item) => (
              <div key={item.kodeAset} className="p-3.5 flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-zinc-900 capitalize">{item.namaAset}</p>
                  <p className="text-[11px] text-zinc-400 font-mono">ID: {item.kodeAset}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Prioritas: Otomatis sistem — <span className="font-semibold">{item.prioritas}</span> (Frekuensi {item.frekuensi}x diminta)
                  </p>
                  {item.alasan && <p className="text-[11px] text-zinc-500 mt-0.5 italic">Alasan: {item.alasan}</p>}
                </div>
                <span className="text-xs font-bold text-[#00664b] shrink-0">{item.jumlahDiminta} Item</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-400">3/3</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer">Ubah</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50">
                <Send size={15} /> {submitting ? 'Mengirim...' : 'Ajukan Permintaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW BON SETELAH SUBMIT */}
      {step === 4 && submittedData && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:p-5 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2"><FileText size={18} className="text-[#00664b]" /> Preview Formulir Permintaan</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Formulir ini dapat diunduh dan dicetak — ID: {submittedData.requestId}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleDownloadPDF} disabled={isExporting} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#00664b] text-[#00664b] hover:bg-emerald-50 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                <Download size={14} /> Download PDF
              </button>
              <button type="button" onClick={handleCetak} disabled={isExporting} className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-zinc-300 text-zinc-600 hover:bg-zinc-50 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                <Printer size={14} /> Cetak
              </button>
            </div>
          </div>

          <div className="p-4 md:p-8 flex justify-center bg-zinc-100 overflow-x-auto">
            <div className="shadow-lg border border-zinc-300 bg-white">
              <TemplateDokumenA4
                ref={printRef}
                formData={submittedData.formData}
                daftarBarang={submittedData.items}
              />
            </div>
          </div>

          <div className="px-4 md:px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
            <button type="button" onClick={handleSelesai} className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer">
              Selesai, Lihat Riwayat <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
