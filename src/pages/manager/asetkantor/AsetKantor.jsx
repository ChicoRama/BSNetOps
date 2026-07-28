import React, { useState } from 'react';
import { Search, Download, Box, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export default function AsetKantorManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');

  // REVISI: Kode ID Aset disesuaikan (AST-EL untuk Elektronik & AST-ATK untuk ATK)
  const [assets] = useState([
    { id: 'AST-ATK-2026-001', nama: 'Kertas HVS A4 80gr', kategori: 'ATK', total: 15, bagus: 15, rusak: 0, lokasi: 'Ruang Rapat Utama' },
    { id: 'AST-ATK-2026-002', nama: 'Pena Gel Hitam Box', kategori: 'ATK', total: 40, bagus: 38, rusak: 2, lokasi: 'Area Kerja Lt. 2' },
    { id: 'AST-EL-2026-001', nama: 'AC Split Daikin 2 PK', kategori: 'Elektronik', total: 8, bagus: 8, rusak: 0, lokasi: 'Seluruh Ruangan' },
    { id: 'AST-EL-2026-002', nama: 'Proyektor Epson EB-X400', kategori: 'Elektronik', total: 5, bagus: 4, rusak: 1, lokasi: 'Ruang Aula' },
    { id: 'AST-ATK-2026-003', nama: 'Buku Agenda Kerja BSN', kategori: 'ATK', total: 12, bagus: 12, rusak: 0, lokasi: 'Ruang Arsip' },
  ]);

  const totalBarang = assets.reduce((acc, curr) => acc + curr.total, 0);
  const totalBagus = assets.reduce((acc, curr) => acc + curr.bagus, 0);
  const totalRusak = assets.reduce((acc, curr) => acc + curr.rusak, 0);

  return (
    <div className="w-full space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-800">
      
      {/* ================= HEADER HALAMAN ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Monitoring Aset Kantor</h2>
          <p className="text-xs text-white-700 font-medium mt-0.5">Tinjauan komprehensif status kondisi, kuantitas, dan lokasi penempatan aset internal BSN.</p>
        </div>
        
        <button 
          onClick={() => alert('Mengunduh laporan rekapitulasi aset kantor format .xlsx')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00664b] hover:bg-[#004d38] text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/10 hover:shadow-lg hover:shadow-emerald-900/20 transition-all duration-300 cursor-pointer self-start sm:self-auto transform hover:-translate-y-0.5"
        >
          <Download size={14} /> Export Laporan
        </button>
      </div>

      {/* ================= KARTU RINGKASAN STATISTIK ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Aset */}
        <div className="bg-white border border-zinc-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-500 shrink-0 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300 shadow-sm">
            <Box size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Volume</p>
            <h3 className="text-xl font-black text-zinc-900 mt-0.5">{totalBarang} <span className="text-xs font-medium text-zinc-400">Unit</span></h3>
          </div>
        </div>

        {/* Kondisi Bagus */}
        <div className="bg-white border border-zinc-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-[#58a27d] shrink-0 group-hover:bg-[#58a27d] group-hover:text-white transition-all duration-300 shadow-sm">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Kondisi Bagus</p>
            <h3 className="text-xl font-black text-[#58a27d] mt-0.5">{totalBagus} <span className="text-xs font-medium text-zinc-400">Unit</span></h3>
          </div>
        </div>

        {/* Kondisi Rusak */}
        <div className="bg-white border border-zinc-200/60 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100/50 flex items-center justify-center text-red-600 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all duration-300 shadow-sm">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Kondisi Rusak</p>
            <h3 className="text-xl font-black text-red-600 mt-0.5">{totalRusak} <span className="text-xs font-medium text-red-400/80">Unit</span></h3>
          </div>
        </div>
      </div>

      {/* ================= FILTER & SEARCH BAR ================= */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full flex items-center">
          <Search size={16} className="absolute left-3.5 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Cari nama aset atau kode ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#00664b] focus:ring-4 focus:ring-[#00664b]/5 transition-all shadow-sm"
          />
        </div>

        <div className="relative w-full sm:w-48 flex items-center">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-bold text-zinc-600 focus:outline-none focus:border-[#00664b] focus:ring-4 focus:ring-[#00664b]/5 cursor-pointer shadow-sm appearance-none"
          >
            <option>Semua Kategori</option>
            <option>ATK</option>
            <option>Elektronik</option>
          </select>
          <ChevronDown size={14} className="absolute right-3.5 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* ================= TABEL DATA ASET KANTOR ================= */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr 
                className="text-[11px] font-black uppercase tracking-wider text-white" 
                style={{ backgroundColor: '#58a27d' }}
              >
                <th className="py-4 px-5">Kode Aset</th>
                <th className="py-4 px-4">Nama Barang</th>
                <th className="py-4 px-4">Kategori</th>
                <th className="py-4 px-4 text-center">Total Stok</th>
                <th className="py-4 px-4 text-center">Bagus</th>
                <th className="py-4 px-4 text-center">Rusak</th>
                <th className="py-4 px-5">Lokasi Penempatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
              {assets
                .filter(item => selectedCategory === 'Semua Kategori' || item.kategori === selectedCategory)
                .filter(item => item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((asset) => (
                  <tr key={asset.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="py-4 px-5 font-mono font-bold text-zinc-900 tracking-tight">{asset.id}</td>
                    <td className="py-4 px-4 font-bold text-zinc-800 group-hover:text-[#58a27d] transition-colors">{asset.nama}</td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-zinc-100 text-zinc-600 rounded-lg">
                        {asset.kategori}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-black text-zinc-900">{asset.total}</td>
                    <td className="py-4 px-4 text-center font-bold text-[#58a27d] bg-emerald-50/10">{asset.bagus}</td>
                    <td className="py-4 px-4 text-center font-bold text-red-600 bg-red-50/10">{asset.rusak}</td>
                    <td className="py-4 px-5 text-zinc-500 font-normal">{asset.lokasi}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-400">
          <span className="font-medium">Menampilkan 1 - 5 dari 5 aset</span>
          <div className="flex items-center gap-1.5">
            <button className="p-1.5 border border-zinc-200 rounded-xl bg-white text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all cursor-pointer shadow-sm">
              <ChevronLeft size={14} />
            </button>
            <button className="w-6 h-6 bg-[#00664b] text-white flex items-center justify-center rounded-xl font-bold shadow-sm">
              1
            </button>
            <button className="p-1.5 border border-zinc-200 rounded-xl bg-white text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all cursor-pointer shadow-sm">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}