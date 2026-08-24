import React, { useState } from 'react';
import { X, Save, UploadCloud, CheckCircle } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function TambahUser({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('manual'); 
  const [formData, setFormData] = useState({ 
    name: '', 
    unit: '', 
    unit_kerja: '', // 🔥 Tambahan Unit Kerja
    role: 'User', 
    status: 'Aktif' 
  });
  
  const [stepImport, setStepImport] = useState(1); 
  const [rawExcelData, setRawExcelData] = useState([]);
  const [aiMapping, setAiMapping] = useState({});
  const [loading, setLoading] = useState(false);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Mendaftarkan user baru...');

    try {
      // 🔥 TRIK NINJA: Membuat Email Siluman (Dummy)
      const rawName = formData.name || 'user';
      const dummyEmail = `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}@bsn.local`;

      const { data: responseData, error: functionError } = await supabase.functions.invoke('import-users', {
        body: { 
          users: [{
            name: formData.name,
            email: dummyEmail, 
            role: formData.role,
            unit: formData.unit,
            unit_kerja: formData.unit_kerja, // 🔥 Unit kerja dikirim
            status: formData.status
          }] 
        }
      });

      if (functionError) throw functionError;
      if (responseData.results[0].status === 'Gagal') {
        throw new Error(responseData.results[0].error || "Nama ini sudah terdaftar di sistem!");
      }

      toast.success(`User berhasil didaftarkan. Password: 12345678`, { id: toastId, duration: 4000 });
      if (onSuccess) onSuccess(); 
      onClose(); 
    } catch (error) {
      toast.error(`Gagal: ${error.message}`, { id: toastId, duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const guessColumn = (headerName) => {
    const text = headerName.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    
    if (text.includes('nama') || text.includes('name') || text.includes('lengkap')) return 'name';
    if (text.includes('role') || text.includes('peran') || text.includes('hakakses') || text.includes('jabatan') || text.includes('akses') || text.includes('level')) return 'role';
    
    // 🔥 Deteksi Unit Kerja / Divisi
    if (text.includes('kerja') || text.includes('departemen') || text.includes('dept') || text.includes('divisi')) return 'unit_kerja';
    
    // 🔥 Deteksi Unit Cabang / Penempatan
    if (text.includes('unit') || text.includes('cabang') || text.includes('penempatan')) return 'unit';
    
    return null; 
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const toastId = toast.loading("Menganalisa file Excel...");

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
          if (guessedField) mappingResult[guessedField] = header; 
        });

        setRawExcelData(jsonData);
        setAiMapping(mappingResult);
        toast.success("Analisa selesai!", { id: toastId });
        setStepImport(2); 
      } catch (err) {
        toast.error("Gagal membaca file.", { id: toastId });
      } finally {
        setLoading(false);
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const executeImport = async () => {
    if (!aiMapping.name) {
      toast.error("Kolom 'Nama Lengkap' tidak terdeteksi di Excel Anda!");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Memproses Dokumen");

    try {
      const formattedUsers = rawExcelData.map(row => {
        const rawName = row[aiMapping.name];
        const dummyEmail = `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}@bsn.local`;

        return {
          email: dummyEmail, 
          name: rawName,
          role: aiMapping.role ? row[aiMapping.role] : 'User',
          unit: aiMapping.unit ? row[aiMapping.unit] : 'Belum Ditentukan',
          unit_kerja: aiMapping.unit_kerja ? row[aiMapping.unit_kerja] : 'Belum Ditentukan', // 🔥 Format Unit Kerja dari Excel
          status: 'Aktif' 
        };
      });

      const { data: responseData, error: functionError } = await supabase.functions.invoke('import-users', {
        body: { users: formattedUsers }
      });

      if (functionError) throw functionError;

      const sukses = responseData.results.filter(r => r.status === 'Berhasil').length;
      toast.success(`${sukses} user berhasil di-import!`, { id: toastId, duration: 5000 });
      
      if (onSuccess) onSuccess(); 
      onClose(); 
    } catch (err) {
      toast.error("Gagal Memproses.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <div className="p-5 border-b flex justify-between items-center bg-zinc-50/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-zinc-950">Daftarkan User Baru</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Password default akun adalah <span className="font-mono font-bold text-red-500 bg-red-50 px-1 rounded">12345678</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-200/70 text-zinc-400 hover:text-zinc-600 rounded-lg transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 shrink-0">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === 'manual' ? 'text-[#00664b] border-b-2 border-[#00664b] bg-[#00664b]/5' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            Formulir Manual
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-sm font-bold transition-all ${activeTab === 'import' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            Import Excel (Otomatis)
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          
          {activeTab === 'manual' && (
            <form id="manualForm" onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Joko Kendil" 
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-all" 
                />
              </div>

              {/* BARIS KEDUA: UNIT CABANG & UNIT KERJA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Unit / Cabang</label>
                  <select 
                    required
                    value={formData.unit} 
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-all"
                  >
                    <option value="" disabled hidden>Pilih Unit / Cabang</option>
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
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Unit Kerja / Divisi</label>
                  <select 
                    required
                    value={formData.unit_kerja} 
                    onChange={(e) => setFormData({ ...formData, unit_kerja: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-all"
                  >
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
                  </select>
                </div>
              </div>

              {/* BARIS KETIGA: HAK AKSES & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Hak Akses</label>
                  <select 
                    required
                    value={formData.role} 
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer transition-all"
                  >
                    <option value="User">User</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Status Awal</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#00664b] bg-white cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Suspend">Suspend</option>
                  </select>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              {stepImport === 1 ? (
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                    <UploadCloud />
                  </div>
                  <h4 className="font-bold text-zinc-800 mb-2">Upload Data Bebas</h4>
                  <p className="text-xs text-zinc-500 mb-6">
                    Sistem <b>Smart-Mapping</b> otomatis mendeteksi kolom Nama, Unit, Unit Kerja, dan Hak Akses dari file Excel Anda. ID BSN akan di-generate otomatis.
                  </p>
                  
                  <label className={`
                    relative cursor-pointer bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition active:scale-95 inline-block
                    ${loading ? 'opacity-70 pointer-events-none' : ''}
                  `}>
                    {loading ? "Menganalisa..." : "Pilih File Excel (.xlsx)"}
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={loading} />
                  </label>
                </div>
              ) : (
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <div className="bg-indigo-50 p-4 border-b border-zinc-200 flex items-center gap-3">
                    <CheckCircle className="text-indigo-600" />
                    <div>
                      <h4 className="font-bold text-sm text-indigo-900">Berhasil</h4>
                      <p className="text-xs text-indigo-700">Ditemukan {rawExcelData.length} baris data.</p>
                    </div>
                  </div>
                  
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                      <tr>
                        <th className="p-3 w-1/2">Data Dibutuhkan</th>
                        <th className="p-3 w-1/2 text-indigo-700">Terbaca dari Excel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {[
                        { id: 'name', label: 'Nama Lengkap (Wajib)' },
                        { id: 'unit', label: 'Unit / Cabang' },
                        { id: 'unit_kerja', label: 'Unit Kerja / Divisi' }, // 🔥 Tabel Info Preview
                        { id: 'role', label: 'Hak Akses' },
                      ].map(item => (
                        <tr key={item.id}>
                          <td className="p-3 font-medium text-zinc-700">{item.label}</td>
                          <td className="p-3 font-bold text-zinc-900">
                            {aiMapping[item.id] ? (
                              <span className="bg-zinc-100 px-2 py-1 rounded">"{aiMapping[item.id]}"</span>
                            ) : (
                              <span className="text-red-400 font-normal italic">Tidak ditemukan</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-3 bg-blue-50/50 text-[11px] text-blue-700 text-center border-t border-zinc-200">
                    *Jika sistem tidak bisa membaca "Hak Akses", maka akun tersebut akan ditetapkan sebagai User.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex justify-end gap-3 shrink-0">
          {activeTab === 'import' && stepImport === 2 && (
            <button 
              type="button" 
              onClick={() => { setStepImport(1); setRawExcelData([]); }} 
              className="px-5 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors mr-auto"
            >
              Ganti File
            </button>
          )}

          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          
          {activeTab === 'manual' ? (
            <button 
              form="manualForm"
              type="submit" 
              disabled={loading} 
              className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan User'}
            </button>
          ) : (
            <button 
              type="button"
              onClick={executeImport}
              disabled={loading || stepImport === 1} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Mulai Import Dokumen'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}