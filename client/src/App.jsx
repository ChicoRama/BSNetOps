import React, { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { supabase } from '../supabaseClient.js';

import LandingPage from "./pages/LandingPage";
import Bantuan from "./pages/barketentuan/Bantuan.jsx";
import 
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPassword from './pages/ResetPassword.jsx';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";

import StokBarang from './pages/admin/stokbarang/StokBarang';
import UserManagement from './pages/admin/manajemenuser/UserManagement'; 
import KategoriBarang from './pages/admin/kategoribarang/KategoriBarang';
import PenyetujuanBarang from './pages/admin/penyetujuan/PenyetujuanBarang.jsx';
import LogAktifitas from './pages/admin/log/LogAktifitas.jsx';
import EditProfil from './pages/admin/user/EditProfil';

import ApprovalRequest from './pages/manager/appreq/ApprovalRequest';
import ActivityLog from './pages/manager/actlog/ActivityLog.jsx';

import Aset from './pages/user/aset/Aset';
import AjukanPermintaan from './pages/user/permintaan/AjukanPermintaan';
import RiwayatPermintaan from './pages/user/riwayat/RiwayatPermintaan';

// =====================================================================
// 🔒 KOMPONEN PROTEKSI RUTE (ROUTE GUARD)
// =====================================================================
const ProtectedRoute = ({ allowedRoles }) => {
  const activeUser = JSON.parse(localStorage.getItem('userProfile')) || JSON.parse(localStorage.getItem('userSession'));
  
  // 1. Jika tidak ada user yang login sama sekali
  if (!activeUser) {
    return <Navigate to="/login" replace />;
  }

  // 🔥 2. CEK FIRST LOGIN: Jika ini login pertama, PAKSA ganti password!
  // Pastikan saat login, data is_first_login dari Supabase ikut tersimpan di localStorage
  if (activeUser.is_first_login === true) {
    return <Navigate to="/reset-password" replace state={{ forceReset: true }} />;
  }

  // 3. Cek Role Validasi
  const userRole = (
    activeUser.role || 
    activeUser.jabatan || 
    activeUser.level || 
    activeUser.tipe || 
    activeUser.type || 
    'user'
  ).toLowerCase();

  if (allowedRoles.includes(userRole)) {
    return <Outlet />;
  }

  // 4. Jika nyasar beda role
  if (userRole === 'admin' || userRole === 'head unit') {
    return <Navigate to="/admin" replace />;
  } else if (userRole === 'manager') {
    return <Navigate to="/manager" replace />;
  } else {
    return <Navigate to="/user" replace />;
  }
};

function DashboardLayout({ role, currentView, setCurrentView, children }) {
  const [isOpen, setIsOpen] = useState(() => JSON.parse(localStorage.getItem('sidebarOpen')) ?? true);

  useEffect(() => { 
    localStorage.setItem('sidebarOpen', JSON.stringify(isOpen)); 
  }, [isOpen]);

  useEffect(() => {
    const validViews = {
      admin: ['dashboard', 'stok-barang', 'manajemen-user', 'kategori-barang', 'log-aktifitas', 'edit-profil', 'penyetujuan-barang'],
      manager: ['dashboard', 'approval-request', 'edit-profil', 'activity-log'],
      user: ['dashboard', 'aset', 'ajukan-permintaan', 'riwayat-permintaan', 'edit-profil']
    };

    if (validViews[role] && !validViews[role].includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [role, currentView, setCurrentView]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 select-none">
      <Sidebar role={role} isOpen={isOpen} setIsOpen={setIsOpen} currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 h-screen flex flex-col overflow-hidden bg-gradient-to-b from-[#00664b]/90 via-zinc-70 to-zinc-30">
        <Header isOpen={isOpen} setIsOpen={setIsOpen} role={role} />
        <main className="flex-1 p-8 overflow-y-auto animate-in fade-in duration-700">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const isDesktop = window.location.protocol === 'file:';
  const AppRouter = isDesktop ? HashRouter : BrowserRouter;

  return (
    <AppRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 1000,
          style: { background: '#ffffff', color: '#272626', borderRadius: '10px' },
        }} 
      />

      <Routes>
        {/* ================= ROUTE PUBLIK ================= */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ================= ROUTE ROLE: ADMIN ================= */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'head unit']} />}>
          <Route path="/admin" element={
            <DashboardLayout role="admin" currentView={currentView} setCurrentView={setCurrentView}>
              {currentView === 'dashboard' && <AdminDashboard />}
              {currentView === 'stok-barang' && <StokBarang role="admin" />}
              {currentView === 'manajemen-user' && <UserManagement />}
              {currentView === 'kategori-barang' && <KategoriBarang />}
              {currentView === 'log-aktifitas' && <LogAktifitas />}
              {currentView === 'edit-profil' && <EditProfil />}
              {currentView === 'penyetujuan-barang' && <PenyetujuanBarang/>}
            </DashboardLayout>
          } />
        </Route>

        {/* ================= ROUTE ROLE: MANAGER ================= */}
        <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
          <Route path="/manager" element={
            <DashboardLayout role="manager" currentView={currentView} setCurrentView={setCurrentView}>
              {currentView === 'dashboard' && <ManagerDashboard />}
              {currentView === 'approval-request' && <ApprovalRequest />}
              {currentView === 'edit-profil' && <EditProfil />}
              {currentView === 'activity-log' && <ActivityLog/>}
            </DashboardLayout>
          } />
        </Route>

        {/* ================= ROUTE ROLE: USER ================= */}
        <Route element={<ProtectedRoute allowedRoles={['user']} />}>
          <Route path="/user" element={
            <DashboardLayout role="user" currentView={currentView} setCurrentView={setCurrentView}>
              {currentView === 'dashboard' && <UserDashboard setCurrentView={setCurrentView} />}
              {currentView === 'aset' && <Aset setCurrentView={setCurrentView} />}
              {currentView === 'ajukan-permintaan' && <AjukanPermintaan />}
              {currentView === 'riwayat-permintaan' && <RiwayatPermintaan />}
              {currentView === 'edit-profil' && <EditProfil />}
            </DashboardLayout>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppRouter>
  );
}