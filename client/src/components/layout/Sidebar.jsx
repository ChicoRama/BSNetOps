import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { menuConfig } from '../../config/menuConfig'; // Sesuaikan jalur impor di proyekmu
import { supabase } from '../../../supabaseClient'; // Sesuaikan dengan lokasi supabaseClient kamu

export default function Sidebar({ role, isOpen, setIsOpen, currentView, setCurrentView }) {
  // Ambil konfigurasi menu berdasarkan role aktif
  const currentMenu = menuConfig[role] || [];

  // State untuk menyimpan data profil dari database
  const [profile, setProfile] = useState({
    name: 'Memuat...',
    avatar: null
  });

  useEffect(() => {
    fetchSidebarProfile();

    // Event listener untuk mendeteksi perubahan di localStorage jika profil baru saja di-edit
    const handleStorageChange = () => {
      fetchSidebarProfile();
    };
    window.addEventListener('storage', handleStorageChange);
    // 🔥 Event custom yang sama dipakai Header.jsx saat profil diperbarui (dalam tab yang sama)
    window.addEventListener('profileUpdated', fetchSidebarProfile);

    // 🔥 Realtime: dengarkan perubahan di tabel user_roles untuk email user yang sedang login
    const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
    const email = activeUser?.email || activeUser?.mail || '';

    const channel = supabase
      .channel('realtime-sidebar-profile')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_roles', filter: email ? `email=eq.${email}` : undefined },
        () => fetchSidebarProfile()
      )
      .subscribe();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', fetchSidebarProfile);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSidebarProfile = async () => {
    try {
      // Dapatkan email dari sesi login yang tersimpan
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const email = activeUser?.email || activeUser?.mail || '';

      if (!email) {
        setProfile({ name: 'Guest', avatar: null });
        return;
      }

      // Tarik data profil (nama dan foto) dari tabel 'user_roles' di Supabase
      const { data, error } = await supabase
        .from('user_roles')
        .select('username, avatar_url')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.username || 'Pengguna BSN',
          avatar: data.avatar_url || null
        });

        // 🔥 Sinkronkan juga ke localStorage agar bagian lain aplikasi ikut update
        const activeUserFull = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession')) || {};
        const updatedLocal = { ...activeUserFull, namaLengkap: data.username || activeUserFull.namaLengkap };
        localStorage.setItem('userProfile', JSON.stringify(updatedLocal));
      }
    } catch (error) {
      console.error('Gagal memuat profil sidebar:', error.message);
      setProfile({ name: 'Pengguna BSN', avatar: null });
    }
  };

  // Fungsi untuk membuat inisial otomatis dari nama (Contoh: "Chico Diar" -> "CD")
  const getInitials = (fullName) => {
    if (!fullName || fullName === 'Memuat...') return '...';
    const words = fullName.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    // DITAMBAHKAN print:hidden DI SINI
    <aside 
      className={`fixed md:sticky top-0 bottom-0 left-0 z-50 h-screen bg-[#FEFEFA] text-zinc-500 flex flex-col justify-between transition-all duration-300 print:hidden ${
        isOpen 
          ? 'w-64 p-4 opacity-100 shadow-[4px_0_24px_rgba(0,0,0,0.08)]' 
          : 'w-0 p-0 opacity-0 overflow-hidden shadow-none'
      }`}
    >
      {/* INTERNAL WRAPPER: Membungkus seluruh konten agar flex-col bekerja sempurna */}
      <div className="flex flex-col h-full justify-between overflow-hidden">
        
        {/* BAGIAN ATAS: NAVIGASI MENU  */}
        <div className="flex flex-col space-y-4 flex-1 overflow-y-auto pr-1 select-none">
          
          {/* Header Kontrol dengan Label Teks MENU di Kiri & Tombol X di Kanan */}
          <div className="flex items-center justify-between px-2 py-1.5 shrink-0">
            {/* Warna label Menu Navigasi disesuaikan ke text-zinc-400 */}
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Menu Navigasi
            </span>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer block"
              title="Tutup Menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Daftar Link Menu Navigasi */}
          <nav className="space-y-1 flex-1">
            {currentMenu.map((menu, idx) => {
              const menuPath = menu.name.toLowerCase().replace(/\s+/g, '-');
              const isActive = currentView === menuPath;

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentView(menuPath)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer group ${
                    isActive 
                      ? 'bg-[#00664b] text-white shadow-sm shadow-emerald-900/10' 
                      : 'hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <span className={`${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-600'} transition-colors`}>
                    {menu.icon}
                  </span>
                  <span>{menu.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BAGIAN BAWAH: PANEL PROFIL DINAMIS (TERKONEKSI DATABASE) */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 px-1 bg-white shrink-0 mt-4">
          <div className="flex items-center gap-3 overflow-hidden">
            
            {/* Avatar Dinamis */}
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 shrink-0 text-xs shadow-sm overflow-hidden">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                getInitials(profile.name)
              )}
            </div>
            
            {/* Label Informasi Pengguna Dinamis */}
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-zinc-800 truncate">{profile.name}</span>
              <span className="text-[10px] capitalize tracking-wider font-bold text-emerald-600 mt-0.5">{role}</span>
            </div>
          </div>

          {/* Tombol Settings Gear */}
          <button 
            onClick={() => setCurrentView('edit-profil')}
            className="p-2 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 rounded-xl transition-all cursor-pointer group"
            title="Pengaturan Profil"
          >
            <Settings 
              size={16} 
              className="transform group-hover:rotate-45 transition-transform duration-300 ease-out" 
            />
          </button>
        </div>

      </div>
    </aside>
  );
}