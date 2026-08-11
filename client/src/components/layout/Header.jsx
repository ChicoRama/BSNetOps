import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, LogOut, ChevronDown, CheckCircle2, XCircle, PackagePlus, TriangleAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient'; 

// 🔥 Format waktu disamakan persis dengan screenshot (contoh: "8 aug, 17.51")
const formatNotifDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase(); 
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}.${minutes}`;
};

export default function Header({ isOpen, setIsOpen, role = 'admin' }) {
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

    // 🔥 Realtime Listener
    const channel = supabase
      .channel('realtime-header-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchUserDataAndNotifs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => fetchUserDataAndNotifs())
      .subscribe();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('profileUpdated', fetchUserDataAndNotifs);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserDataAndNotifs = async () => {
    try {
      const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
      const email = activeUser?.email || activeUser?.mail || '';
      
      if (!email) return;

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

      // 🔥 Fetch notifikasi tanpa auto-delete 24 jam
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(50); // Menampilkan maksimal 50 riwayat notifikasi

      let allNotifs = notifData && !notifError ? notifData : [];

      if (role === 'admin' || role === 'manager') {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('id, name, stock')
          .is('deleted_at', null);

        if (itemsData && !itemsError) {
          const criticalItems = itemsData.filter(item => (parseInt(item.stock) || 0) < 5); // Standar aman < 5 sesuai screenshot
          
          if (criticalItems.length > 0) {
            const stockAlertNotifs = criticalItems.map(item => ({
              id: `system-alert-stock-${item.id}`,
              title: 'Peringatan Stok Menipis!',
              message: `${item.name} kurang dari standar aman (<5)\nStok saat ini tersisa ${item.stock}`,
              type: 'alert',
              is_read: false, 
              created_at: new Date().toISOString()
            }));

            allNotifs = [...stockAlertNotifs, ...allNotifs];
          }
        }
      }

      setNotifications(allNotifs);

    } catch (error) {
      console.error('Error fetching header data:', error.message);
    }
  };

  const deleteNotif = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (typeof id === 'string' && id.startsWith('system-alert-stock')) return;
    await supabase.from('notifications').delete().eq('id', id);
  };

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (typeof id === 'string' && id.startsWith('system-alert-stock')) return; 
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
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

  const renderNotifIcon = (type, isRead) => {
    if (type === 'alert') return <TriangleAlert size={20} strokeWidth={2} className="text-red-600" />;
    return <PackagePlus size={20} strokeWidth={2} className={!isRead ? "text-blue-600" : "text-zinc-400"} />;
  };

  return (
    <header className="h-16 bg-[#00664b] flex items-center px-6 justify-between text-white shadow-md relative z-50 print:hidden select-none">
      <div className="flex items-center gap-4">
        {!isOpen && (
          <button onClick={() => setIsOpen(true)} className="hover:text-zinc-200 transition-colors cursor-pointer">
            <Menu size={24} />
          </button>
        )}
        <img src="./logobsn.png" alt="Logo" className="h-8 w-auto" />
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
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm border-2 border-[#00664b]">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-3 w-[350px] bg-white border border-zinc-200 shadow-2xl rounded-xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 text-zinc-700">
              
              {/* HEADER NOTIFIKASI */}
              <div className="px-5 py-4 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-zinc-900 tracking-tight">Notifikasi :</span>
                  <span className="text-[13px] font-semibold px-2.5 py-0.5 bg-[#d1fae5] text-[#00664b] rounded-md capitalize">
                    {role}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs font-semibold text-[#00664b] hover:text-[#004d38] cursor-pointer transition-colors">
                      Tandai Dibaca
                    </button>
                  )}
                </div>
              </div>

              {/* DAFTAR NOTIFIKASI */}
              <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs font-medium">Tidak ada notifikasi.</div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => markAsRead(notif.id)}
                      className={`group relative overflow-hidden border-b border-zinc-100 last:border-b-0 p-4 flex cursor-pointer transition-colors ${
                        notif.type === 'alert' ? 'bg-[#ffedeb]' : 'bg-white'
                      } ${notif.is_read && notif.type !== 'alert' ? 'opacity-60' : ''}`}
                    >
                      {/* Titik Biru (Unread) */}
                      <div className="w-4 flex items-start pt-1.5 justify-start shrink-0">
                        {!notif.is_read && (
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      
                      {/* Ikon */}
                      <div className="shrink-0 mr-3 mt-0.5">
                        {renderNotifIcon(notif.type, notif.is_read)}
                      </div>

                      {/* Konten Teks */}
                      <div className="flex-1 pr-6 flex flex-col justify-center">
                        <p className={`text-[14px] font-semibold leading-tight ${notif.type === 'alert' ? 'text-red-600' : (!notif.is_read ? 'text-zinc-900' : 'text-zinc-600')}`}>
                          {notif.title}
                        </p>
                        
                        <div className={`text-[12px] mt-0.5 leading-snug ${notif.type === 'alert' ? 'text-red-600' : (!notif.is_read ? 'text-zinc-600' : 'text-zinc-500')}`}>
                          {notif.message.split('\n').map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium pt-1.5">
                          {formatNotifDate(notif.created_at)}
                        </p>
                      </div>

                      {/* Tombol Silang (X) Merah muncul otomatis di Kanan Atas hanya saat kursor di-hover */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                        className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:bg-red-100 rounded-md p-0.5 cursor-pointer"
                        title="Hapus Notifikasi"
                      >
                        <X size={15} strokeWidth={2.5} />
                      </button>
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