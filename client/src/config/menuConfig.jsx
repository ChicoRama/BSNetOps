import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  CheckSquare, 
  PlusCircle, 
  Boxes, 
  History,
  FileText,
  ActivityIcon,
  Check
} from 'lucide-react';

export const menuConfig = {
  admin: [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Stok Barang', icon: <Package size={20}/> },
    { name: 'Kategori Barang', icon: <Boxes size={20}/> },
    { name: 'Penyetujuan Barang', icon: <Check size={20}/>},
    { name: 'Manajemen User', icon: <Users size={20}/> },
    { name: 'Activity Log', icon: <ActivityIcon size={20}/> },
  ],
  manager: [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Approval Request', icon: <CheckSquare size={20}/> },
    { name: 'Activity Log', icon: <ActivityIcon size={20}/>},
  ],
  user: [
    { name: 'Dashboard', icon: <LayoutDashboard size={20}/> },
    { name: 'Aset', icon: <Package size={20}/> }, 
    { name: 'Ajukan Permintaan', icon: <FileText size={20}/> }, 
    { name: 'Riwayat Permintaan', icon: <History size={20}/> }, 
  ]
};