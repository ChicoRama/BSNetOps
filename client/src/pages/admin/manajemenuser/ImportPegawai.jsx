import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';
import { FaCloudUploadAlt, FaMagic, FaCheckCircle } from 'react-icons/fa';

export default function ImportPegawai() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Review AI Mapping
  
  const [rawExcelData, setRawExcelData] = useState([]);
  const [aiMapping, setAiMapping] = useState({});

  // 🔥 1. OTAK PINTAR (SMART MAPPER) UNTUK MENEBAK KOLOM
  const guessColumn = (headerName) => {
    const text = headerName.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    
    if (text.includes('mail') || text.includes('surel')) return 'email';
    if (text.includes('nama') || text.includes('name') || text.includes('lengkap')) return 'name';
    if (text.includes('role') || text.includes('peran') || text.includes('hakakses') || text.includes('jabatan') || text.includes('level')) return 'role';
    
    // 🔥 Deteksi Unit Kerja
    if (text.includes('kerja') || text.includes('departemen') || text.includes('dept')) return 'unit_kerja';
    
    if (text.includes('unit') || text.includes('divisi') || text.includes('cabang') || text.includes('penempatan')) return 'unit';
    if (text.includes('nip') || text.includes('nik') || text.includes('id') || text.includes('nomor')) return 'staff_id';
    
    return null; 
  };

  // 🔥 2. BACA EXCEL & JALANKAN AI
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const toastId = toast.loading("AI sedang membaca dan menganalisa file...");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) throw new Error("Excel Kosong");

        const headers = Object.keys(jsonData[0]);
        let mappingResult = {};
        
        headers.forEach(header => {
          const guessedField = guessColumn(header);
          if (guessedField) {
            mappingResult[guessedField] = header; 
          }
        });

        setRawExcelData(jsonData);
        setAiMapping(mappingResult);
        
        toast.success("Analisa selesai!", { id: toastId });
        setStep(2); 
      } catch (err) {
        toast.error("Gagal membaca file. Pastikan formatnya benar.", { id: toastId });
      } finally {
        setIsLoading(false);
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 🔥 3. PROSES MENTRANSLATE DATA & KIRIM KE EDGE FUNCTION
  const executeImport = async () => {
    if (!aiMapping.email) {
      toast.error("Sistem tidak menemukan kolom Email/Surel di file Anda!");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Memformat ulang data & mengirim ke server...");

    try {
      const formattedUsers = rawExcelData.map(row => ({
        email: row[aiMapping.email],
        name: aiMapping.name ? row[aiMapping.name] : row[aiMapping.email].split('@')[0],
        role: aiMapping.role ? row[aiMapping.role] : 'user',
        unit: aiMapping.unit ? row[aiMapping.unit] : 'Belum Ditentukan',
        unit_kerja: aiMapping.unit_kerja ? row[aiMapping.unit_kerja] : 'Belum Ditentukan', // 🔥 Format Unit Kerja
        staff_id: aiMapping.staff_id ? row[aiMapping.staff_id] : `BSN-AUTO-${Math.floor(Math.random()*1000)}`
      }));

      const { data: responseData, error: functionError } = await supabase.functions.invoke('import-users', {
        body: { users: formattedUsers }
      });

      if (functionError) throw functionError;

      const sukses = responseData.results.filter(r => r.status === 'Berhasil').length;
      
      toast.success(
        (t) => (
          <div>
            <b>Import Sukses!</b>
            <p className="text-xs mt-1">{sukses} user berhasil ditambahkan.</p>
          </div>
        ),
        { id: toastId, duration: 5000 }
      );
      
      setStep(1);
      setRawExcelData([]);
      setAiMapping({});
    } catch (err) {
      toast.error("Gagal melakukan import massal.", { id: toastId });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#00634b] mb-6 flex items-center gap-2">
        <FaMagic className="text-yellow-500" /> Smart Import Pegawai
      </h1>

      {/* TAHAP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-2xl text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            <FaCloudUploadAlt />
          </div>
          <h2 className="font-bold text-xl mb-2">Upload Data Bebas</h2>
          <p className="text-sm text-slate-500 mb-6 px-4">
            Upload file Excel dari HRD. Sistem <b>Smart-Mapping</b> kami akan otomatis mencari mana kolom Nama, Email, NIP, Divisi, dan Unit Kerja tanpa perlu format khusus!
          </p>
          
          <label className={`
            relative cursor-pointer bg-[#00634b] text-white px-8 py-3 rounded-lg text-sm font-bold shadow-md hover:bg-[#004d3a] transition active:scale-95 inline-block
            ${isLoading ? 'opacity-70 pointer-events-none' : ''}
          `}>
            {isLoading ? "AI Sedang Bekerja..." : "Pilih File Excel (.xlsx)"}
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isLoading}
            />
          </label>
        </div>
      )}

      {/* TAHAP 2: REVIEW AI MAPPING */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-3xl animate-in fade-in zoom-in-95 duration-300">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2 text-indigo-700">
            <FaCheckCircle /> Hasil Analisa
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Sistem kami mendeteksi kolom berikut dari file Anda. Pastikan data tersebut benar sebelum diimport (Total {rawExcelData.length} baris).
          </p>

          {/* TABEL PREVIEW */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-1/2">Kebutuhan Database</th>
                  <th className="p-3 w-1/2 text-indigo-700">Terdeteksi dari Excel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { id: 'email', label: 'Email (Wajib)' },
                  { id: 'name', label: 'Nama Pegawai' },
                  { id: 'staff_id', label: 'NIP / ID Staff' },
                  { id: 'unit', label: 'Unit / Cabang' },
                  { id: 'unit_kerja', label: 'Unit Kerja' }, // 🔥 Tabel Preview Unit Kerja
                  { id: 'role', label: 'Hak Akses / Role' },
                ].map(item => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium text-slate-700">{item.label}</td>
                    <td className="p-3 font-bold text-[#00634b]">
                      {aiMapping[item.id] ? (
                        <span className="bg-[#e7f0ec] px-2 py-1 rounded">Kolom "{aiMapping[item.id]}"</span>
                      ) : (
                        <span className="text-red-400 font-normal italic">Tidak ditemukan (Dibuat otomatis)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              onClick={executeImport}
              className="flex-1 cursor-pointer bg-[#00634b] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-[#004d3a] transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Mengirim Data..." : "Ya, Lanjutkan Import!"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}