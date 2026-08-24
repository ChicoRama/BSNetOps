import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Camera, Save, Building, Briefcase, Layers } from 'lucide-react';
import { supabase } from '../../../../supabaseClient'; 
import toast from 'react-hot-toast';

const toTitleCase = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function EditProfil() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const [profile, setProfile] = useState({
    namaLengkap: '',
    nipPegawai: '',
    cabang: '',       // Untuk KC Semarang, dll (kolom 'unit' di DB)
    unitKerja: '',    // Untuk CWO, FA & FD, dll (kolom 'unit_kerja' di DB)
    jabatan: '',      // Untuk role (Admin/Manager/User)
    avatar: null
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfileFromSupabase();
  }, []);

  const fetchProfileFromSupabase = async () => {
    setLoading(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const email = activeUser?.email || activeUser?.mail || '';
      
      if (!email) {
        setLoading(false);
        return;
      }

      setUserEmail(email);

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          namaLengkap: data.nama_lengkap || data.username || '',
          nipPegawai: data.staff_id || '-',
          cabang: data.unit || '',                
          unitKerja: data.unit_kerja || '',       
          jabatan: data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'User',
          avatar: data.avatar_url || null
        });
      }
    } catch (error) {
      console.error('Gagal mengambil data autofill profil:', error.message);
      toast.error('Gagal memuat data profil!');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran foto maksimal 2MB!');
        return;
      }
      setSelectedFile(file);
      const imageUrl = URL.createObjectURL(file);
      setProfile({ ...profile, avatar: imageUrl });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Auto-capitalize khusus untuk field nama lengkap
    const finalValue = name === 'namaLengkap' ? toTitleCase(value) : value;
    setProfile(prev => ({ ...prev, [name]: finalValue }));
  };

  // SIMPAN PERUBAHAN KE DATABASE SUPABASE
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const toastId = toast.loading('Menyimpan perubahan profil...');

    try {
      let avatarUrl = profile.avatar;

      // Jika ada file foto baru, upload dulu ke Supabase Storage
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicURLData.publicUrl;
      }

      // Update data di tabel user_roles
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({
          nama_lengkap: profile.namaLengkap,
          username: profile.namaLengkap,
          unit: profile.cabang,             
          unit_kerja: profile.unitKerja,    
          avatar_url: avatarUrl
        })
        .eq('email', userEmail);

      if (updateError) throw updateError;

      // Update Session LocalStorage biar UI Header update otomatis
      localStorage.setItem('userProfile', JSON.stringify({
        email: userEmail,
        namaLengkap: profile.namaLengkap,
        divisi: profile.cabang,
        jabatan: profile.jabatan,
        avatar: avatarUrl
      }));

      toast.success('Profil berhasil diperbarui!', { id: toastId });
      window.dispatchEvent(new Event('profileUpdated'));
      fetchProfileFromSupabase();

    } catch (error) {
      console.error('Gagal menyimpan profil:', error.message);
      toast.error('Gagal menyimpan: ' + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-white font-medium">Memuat data profil...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-xl font-bold text-white">Pengaturan Akun</h2>
        <p className="text-xs text-white/80 mt-0.5">Kelola identitas personal dan info kontak Anda</p>
      </div>

      <div className="bg-white border border-zinc-200/80 shadow-md rounded-2xl overflow-hidden">
        <div className="h-24 bg-[#58a27d]"></div>

        <form onSubmit={handleSave} className="p-6 pt-0 space-y-6 relative">
          <div className="flex flex-col sm:flex-row items-center gap-4 -mt-12 sm:items-end mb-4">
            <div className="relative group w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-zinc-100 overflow-hidden shrink-0">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-2xl text-[#478767] bg-emerald-50 tracking-tighter">
                  {profile.namaLengkap ? profile.namaLengkap.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'BSN'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
              >
                <Camera size={18} />
              </button>
            </div>
            
            <div className="text-center sm:text-left pb-1">
              <h4 className="text-sm font-bold text-zinc-800">Foto Profil</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Rekomendasi rasio kotak persegi maks 2MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* ROW 1 */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Nama Lengkap</label>
              <div className="relative flex items-center">
                <User size={16} className="absolute left-3 text-zinc-400" />
                <input type="text" name="namaLengkap" value={profile.namaLengkap} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#58a27d] focus:bg-white font-medium text-zinc-800 transition-colors" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">ID Pegawai</label>
              <div className="relative flex items-center">
                <Shield size={16} className="absolute left-3 text-zinc-400" />
                <input type="text" name="nipPegawai" value={profile.nipPegawai} disabled className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 font-medium cursor-not-allowed" title="ID Pegawai tidak dapat diubah" />
              </div>
            </div>

            {/* ROW 2: CABANG & UNIT KERJA */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Unit / Cabang</label>
              <div className="relative flex items-center">
                <Building size={16} className="absolute left-3 text-zinc-400 z-10 pointer-events-none" />
                <select 
                  name="cabang" 
                  value={profile.cabang} 
                  onChange={handleChange} 
                  className="w-full pl-10 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#58a27d] focus:bg-white font-medium text-zinc-800 transition-colors cursor-pointer appearance-none" 
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
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Divisi / Unit Kerja</label>
              <div className="relative flex items-center">
                <Layers size={16} className="absolute left-3 text-zinc-400 z-10 pointer-events-none" />
                <select 
                  name="unitKerja" 
                  value={profile.unitKerja} 
                  onChange={handleChange} 
                  className="w-full pl-10 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#58a27d] focus:bg-white font-medium text-zinc-800 transition-colors cursor-pointer appearance-none" 
                  required
                >
                  <option value="" disabled hidden>Pilih Divisi</option>
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

            {/* ROW 3: JABATAN (FULL WIDTH COL-SPAN-2) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Jabatan / Role</label>
              <div className="relative flex items-center">
                <Briefcase size={16} className="absolute left-3 text-zinc-400" />
                <input type="text" name="jabatan" value={profile.jabatan} disabled className="w-full pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-500 font-medium cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100 flex justify-end mt-4">
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#58a27d] hover:bg-[#478767] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md shadow-[#58a27d]/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50">
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}