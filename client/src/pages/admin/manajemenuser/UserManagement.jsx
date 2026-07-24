import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Search, Filter, Shield, UserCheck, RotateCcw, XCircle, ArrowLeft } from 'lucide-react';
import TambahUser from './TambahUser';
import EditUser from './EditUser';
import { supabase } from '../../../../supabaseClient'; // Sesuaikan path import supabaseClient Anda

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [showTrash, setShowTrash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('Semua');

  // 🔥 FETCH DATA DARI TABEL `user_roles` SUPABASE SAAT KOMPONEN DIMUAT
  useEffect(() => {
    fetchUsersFromSupabase();
  }, []);

  const fetchUsersFromSupabase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Mapping data dari Supabase ke format state komponen
        const formattedData = data.map(u => ({
          id: u.staff_id || u.id,
          originalId: u.id, // Primary Key UUID asli untuk query Supabase (.eq('id', ...))
          name: u.username || 'Tanpa Nama',
          email: u.email,
          role: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Staff',
          status: 'Aktif', // Bisa disesuaikan jika ada kolom status di database
          isDeleted: u.deleted_at ? true : false,
          deleted_at: u.deleted_at
        }));
        setUsers(formattedData);
      }
    } catch (error) {
      console.error('Gagal memuat data user:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  // 🔥 UPDATE USER KE SUPABASE
  const handleUpdateUser = async (updatedUser) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({
          username: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role.toLowerCase(),
          unit: updatedUser.unit
        })
        .eq('id', updatedUser.originalId);

      if (error) throw error;

      setUsers(users.map(user => user.originalId === updatedUser.originalId ? updatedUser : user));
      setIsEditOpen(false);
      alert(`Sukses: Data akun ${updatedUser.name} berhasil diperbarui!`);
      fetchUsersFromSupabase();
    } catch (error) {
      console.error('Gagal memperbarui user:', error.message);
      alert('Terjadi kesalahan saat memperbarui database.');
    }
  };

  // 🔥 SOFT DELETE (ARSIP KE TRASH) DI SUPABASE
  const handleSoftDelete = async (originalId, name) => {
    if (window.confirm(`Apakah Anda yakin ingin memindahkan akun ${name} ke tempat sampah?`)) {
      try {
        const timestamp = new Date().toISOString();
        const { error } = await supabase
          .from('user_roles')
          .update({ deleted_at: timestamp })
          .eq('id', originalId);

        if (error) throw error;

        setUsers(users.map(user => 
          user.originalId === originalId ? { ...user, isDeleted: true, deleted_at: timestamp } : user
        ));
      } catch (error) {
        console.error('Gagal mengarsipkan akun:', error.message);
        alert('Terjadi kesalahan pada database.');
      }
    }
  };

  // 🔥 RESTORE USER DARI TRASH
  const handleRestore = async (originalId, name) => {
    if (window.confirm(`Kembalikan hak akses akun untuk ${name}?`)) {
      try {
        const { error } = await supabase
          .from('user_roles')
          .update({ deleted_at: null })
          .eq('id', originalId);

        if (error) throw error;

        setUsers(users.map(user => 
          user.originalId === originalId ? { ...user, isDeleted: false, deleted_at: null } : user
        ));
      } catch (error) {
        console.error('Gagal memulihkan akun:', error.message);
        alert('Terjadi kesalahan pada database.');
      }
    }
  };

  // 🔥 HARD DELETE (HAPUS PERMANEN) DARI SUPABASE
  const handleHardDelete = async (originalId, name) => {
    if (window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus PERMANEN akun ${name}? Data tidak dapat dikembalikan.`)) {
      try {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('id', originalId);

        if (error) throw error;

        setUsers(users.filter(user => user.originalId !== originalId));
      } catch (error) {
        console.error('Gagal menghapus permanen akun:', error.message);
        alert('Terjadi kesalahan pada database.');
      }
    }
  };

  const processedUsers = users
    .filter(user => user.isDeleted === showTrash)
    .filter(user => (roleFilter === 'Semua' ? true : user.role === roleFilter))
    .filter(user => {
      const query = searchQuery.toLowerCase();
      return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      
      {/* Header Utama disamakan dengan layout Stok Barang */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          {showTrash && (
            <button 
              onClick={() => setShowTrash(false)} 
              className="p-2 bg-white border border-zinc-200 rounded-xl shadow-md text-[#00664b] hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">Manajemen Hak Akses Akun</h2>
            <p className="text-xs text-white/80 mt-0.5">
              {showTrash ? 'Daftar arsip akun (Trash)' : 'Kelola verifikasi profil, peran hak akses, dan kredensial sistem logistik BSN'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {!showTrash && (
            <button 
              onClick={() => setShowTrash(true)} 
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-700 border border-zinc-200 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer shadow-md group"
            >
              <Trash2 size={16} />
            </button>
          )}
          
          {!showTrash && (
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 bg-[#00664b] hover:bg-[#00553e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Plus size={16} /> Daftarkan User Baru
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-md border border-zinc-200/80">
        <div className="flex-1 relative flex items-center">
          <Search size={18} className="absolute left-3 text-zinc-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama staff atau alamat email resmi..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#00664b] focus:bg-white transition-colors"
          />
        </div>
        
        <div className="relative flex items-center bg-zinc-50 border border-zinc-200 rounded-lg px-3 hover:bg-zinc-100 transition-colors">
          <Filter size={16} className="text-zinc-500 mr-2" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent text-sm text-zinc-600 focus:outline-none cursor-pointer py-2 pr-2 font-medium"
          >
            <option value="Semua">Hak Akses</option>
            <option value="Admin">Admin</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#58a27d] border-[#58a27d] text-white text-xs uppercase font-semibold tracking-wider border-b">
                <th className="p-4 rounded-tl-xl">ID User</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Email Resmi</th>
                <th className="p-4">Hak Akses</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right rounded-tr-xl">Aksi Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-400 font-medium bg-zinc-50/30">
                    Memuat data dari database...
                  </td>
                </tr>
              ) : processedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-400 font-medium bg-zinc-50/30">
                    {showTrash 
                      ? "Keranjang sampah kosong." 
                      : "Tidak ditemukan data user yang cocok dengan kriteria pencarian."}
                  </td>
                </tr>
              ) : (
                processedUsers.map((user) => (
                  <tr key={user.originalId} className="hover:bg-zinc-50/40 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-zinc-900 bg-zinc-50/30">{user.id}</td>
                    <td className="p-4 font-semibold text-zinc-900">{user.name}</td>
                    <td className="p-4 text-zinc-900 font-medium">{user.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        user.role === 'Admin' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {user.role === 'Admin' ? <Shield size={12} /> : <UserCheck size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {showTrash ? (
                        <span className="text-xs font-semibold text-red-500">Terhapus</span>
                      ) : (
                        <>
                          <span className={`inline-block h-2 w-2 rounded-full mr-2 ${user.status === 'Aktif' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span className={`text-xs font-semibold ${user.status === 'Aktif' ? 'text-zinc-800' : 'text-red-600'}`}>{user.status}</span>
                        </>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      {showTrash ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleRestore(user.originalId, user.name)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <RotateCcw size={14} /> Restore
                          </button>
                          <button 
                            onClick={() => handleHardDelete(user.originalId, user.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <XCircle size={14} /> Hapus Permanen
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditClick(user)}
                            title="Edit Data"
                            className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center cursor-pointer"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleSoftDelete(user.originalId, user.name)}
                            title="Pindah ke Tempat Sampah"
                            className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all inline-flex items-center cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <TambahUser 
          onClose={() => setIsAddOpen(false)} 
          onSuccess={() => {
            setIsAddOpen(false);
            fetchUsersFromSupabase();
          }} 
        />
      )}
      
      {isEditOpen && (
        <EditUser 
          userData={selectedUser} 
          onSave={handleUpdateUser} 
          onClose={() => setIsEditOpen(false)} 
        />
      )}

    </div>
  );
}