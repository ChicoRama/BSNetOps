import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, LogOut, ChevronDown, CheckCircle2, XCircle, PackagePlus, Clock, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient'; 

// Helper untuk format waktu (contoh: "5 menit lalu")
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mnt lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} hr lalu`;
};

export default function Header({ isOpen, setIsOpen, role = 'manager' }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState({ name: 'User', email: '', avatar: null });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchUserDataAndNotifs();

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('profileUpdated', fetchUserDataAndNotifs);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('profileUpdated', fetchUserDataAndNotifs);
    };
  }, []);

  const fetchUserDataAndNotifs = async () => {
    try {
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const email = activeUser?.email || activeUser?.mail || '';
      
      if (!email) return;

      // 1. Ambil Data Profil untuk Header Kanan Atas
      const { data: profileData } = await supabase
        .from('user_roles')
        .select('username, avatar_url')
        .eq('email', email)
        .maybeSingle();

      if (profileData) {
        setUserProfile({
          name: profileData.username || 'Pengguna',
          email: email,
          avatar: profileData.avatar_url || null
        });
      }

      // 2. Ambil Data Notifikasi dari Supabase
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(10);

      let allNotifs = notifData && !notifError ? notifData : [];

      // 🔥 3. JIKA ADMIN / MANAGER: Cek Stok Barang Kritis (<= 3)
      if (role === 'admin' || role === 'manager') {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('id, name, stock')
          .is('deleted_at', null);

        if (itemsData && !itemsError) {
          const criticalItems = itemsData.filter(item => (parseInt(item.stock) || 0) <= 3);
          
          if (criticalItems.length > 0) {
            // Buat 1 notifikasi khusus berupa peringatan sistem (tidak disimpan di database notif, hanya muncul di UI)
            const stockAlertNotif = {
              id: 'system-alert-stock', // ID statis agar mudah dikenali
              title: 'Peringatan Stok Menipis!',
              // 🔥 INI BAGIAN YANG DIPERBAIKI: Mengambil angka stok asli dari database
              message: `Terdapat ${criticalItems.length} item menipis (termasuk ${criticalItems[0].name} sisa ${criticalItems[0].stock} unit). Segera lakukan restock.`,
              type: 'alert',
              is_read: false, 
              created_at: new Date().toISOString()
            };

            // Sisipkan notifikasi peringatan ke barisan paling atas
            allNotifs = [stockAlertNotif, ...allNotifs];
          }
        }
      }

      setNotifications(allNotifs);

    } catch (error) {
      console.error('Error fetching header data:', error.message);
    }
  };

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    
    // Jangan kirim update ke Supabase jika yang diklik adalah notifikasi sistem (alert stok)
    if (id !== 'system-alert-stock') {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_email', userProfile.email);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userSession');
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const renderNotifIcon = (type) => {
    switch (type) {
      case 'approved': return <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />;
      case 'rejected': return <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />;
      case 'request': return <PackagePlus size={16} className="text-blue-600 shrink-0 mt-0.5" />;
      case 'alert': return <TriangleAlert size={16} className="text-red-600 shrink-0 mt-0.5" />;
      default: return <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="h-16 bg-[#00664b] flex items-center px-6 justify-between text-white shadow-md relative z-50 print:hidden select-none">
      <div className="flex items-center gap-4">
        {!isOpen && (
          <button onClick={() => setIsOpen(true)} className="hover:text-zinc-200 transition-colors cursor-pointer">
            <Menu size={24} />
          </button>
        )}
        <img src="/logobsn.png" alt="Logo" className="h-8 w-auto" />
      </div>
      
      <div className="flex items-center gap-4">
        {/* DROPDOWN NOTIFIKASI */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
            className="p-2 rounded-full hover:bg-white/10 transition-all relative cursor-pointer"
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 shadow-xl rounded-xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 text-zinc-700">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900">Notifikasi</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 bg-[#dcfce7] text-[#00664b] rounded-md capitalize tracking-wide border border-[#bbf7d0]">
                    {role}
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-bold text-[#00664b] hover:underline cursor-pointer">
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs font-medium">Tidak ada notifikasi baru</div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3.5 flex gap-3 hover:bg-zinc-50 transition-colors cursor-pointer relative ${
                        !notif.is_read ? (notif.type === 'alert' ? 'bg-red-50/60' : 'bg-emerald-50/30') : 'bg-white'
                      }`}
                    >
                      {!notif.is_read && <div className="absolute left-1 top-5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                      
                      {renderNotifIcon(notif.type)}
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold ${notif.type === 'alert' ? 'text-red-700' : (!notif.is_read ? 'text-zinc-900' : 'text-zinc-400')}`}>
                            {notif.title}
                          </p>
                          <span className="text-[9px] text-zinc-400 font-medium">{formatTimeAgo(notif.created_at)}</span>
                        </div>
                        <p className={`text-[11px] leading-snug ${notif.type === 'alert' ? 'text-red-600 font-medium' : (!notif.is_read ? 'text-zinc-600' : 'text-zinc-400')}`}>
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN PROFIL HEADER */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }} className="flex items-center gap-2 cursor-pointer group focus:outline-none text-white">
            <div className="h-8 w-8 rounded-full border border-white/40 overflow-hidden bg-[#478767] flex items-center justify-center font-bold text-xs shadow-sm">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials(userProfile.name)
              )}
            </div>
            <ChevronDown size={14} className={`text-white/70 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-zinc-200 shadow-xl rounded-xl p-1.5 animate-in fade-in zoom-in-95 z-50 text-zinc-700">
              <div className="px-3 py-1.5 border-b border-zinc-100 mb-1 select-none flex flex-col truncate">
                <span className="text-xs font-bold text-zinc-800 truncate">{userProfile.name}</span>
                <span className="text-[10px] text-zinc-400 capitalize font-medium">{role}</span>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                <LogOut size={15} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}