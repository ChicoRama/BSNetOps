import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LabelList } from 'recharts';
import { Plus, Trash2, Edit3 } from 'lucide-react';

// Kategori (Elektronik, ATK, dan Lainnya)
const data = [
  { name: 'Elektronik', value: 400 },
  { name: 'ATK', value: 300 },
  { name: 'Lainnya', value: 200 },
];

// Warna (Hijau BSN, Biru, dan Kuning/Amber)
const COLORS = ['#00664b', '#3B82F6', '#FFBF00'];

const activityLogs = [
  { id: 1, item: 'Laptop Dell', unit: 'KC Semarang', category: 'Elektronik', type: 'Keluar', date: '30/06/2026' },
  { id: 2, item: 'Kertas A4', unit: 'KCP Ungaran', category: 'ATK', type: 'Masuk', date: '30/06/2026' },
  { id: 3, item: 'Proyektor Portable', unit: 'KCP Kendal', category: 'Lainnya', type: 'Keluar', date: '29/06/2026' },
];

export default function AdminDashboard({ role = 'admin' }) {
  // stokAwalGudang adalah jumlah barang sebelum ditambah barang masuk
  const stokAwalGudang = 0; 
  const barangMasuk = 452;
  const barangKeluar = 12;

  const totalBarang = stokAwalGudang + barangMasuk - barangKeluar;

  return (
    <div className="space-y-6">
      {/* Header Utama */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white capitalize">Admin Overview</h2>
          <p className="text-xs text-white mt-0.5">Mode Kontrol Penuh Akun Inventaris Gudang</p>
        </div>
      </div>

      {/* 3. Ringkasan Statistik (Dibuat Rounded & Shadow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card: Total Barang (Hasil Rumus) */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md transition-all hover:scale-[1.01]">
          <h3 className="text-zinc-500 text-sm font-medium">Total Barang</h3>
          <p className="text-3xl font-bold text-zinc-900 mt-2">
            {/* toLocaleString() untuk otomatis memberi format titik (1.284) */}
            {totalBarang.toLocaleString('id-ID')}
          </p>
        </div>
        
        {/* Card: Barang Masuk */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md transition-all hover:scale-[1.01]">
          <h3 className="text-zinc-500 text-sm font-medium">Barang Masuk</h3>
          <p className="text-3xl font-bold text-zinc-900 mt-2">
            {barangMasuk.toLocaleString('id-ID')}
          </p>
        </div>
        
        {/* Card: Barang Keluar */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md transition-all hover:scale-[1.01]">
          <h3 className="text-zinc-500 text-sm font-medium">Barang Keluar</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {barangKeluar.toLocaleString('id-ID')}
          </p>
        </div>

      </div>

      {/* 4. Bagian Konten Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Grafik Distribusi Stok (3 Kategori) */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Distribusi Kategori</h2>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <Pie data={data} startAngle={180} endAngle={0} innerRadius={60} outerRadius={80} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    formatter={(value, entry) => {
                      const { payload } = entry;
                      return (
                        <span className="text-zinc-600 font-medium">
                          {value}: <span className="font-bold text-zinc-600">{payload.value}</span>
                        </span>
                      );
                    }}
                  />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabel Aktivitas Terakhir */}
        <div className="bg-white p-6 border border-zinc-200/80 rounded-xl shadow-md overflow-hidden">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Aktivitas Terakhir</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-zinc-500 border-b bg-zinc-50/50 text-xs uppercase font-semibold">
                  <th className="pb-3 pt-2 px-2">Barang</th>
                  <th className="pb-3 pt-2 px-2">Unit</th>
                  <th className="pb-3 pt-2 px-2">Status</th>
                  <th className="pb-3 pt-2 px-2">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activityLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50/40 transition-colors">
                    <td className="py-4 px-2 font-medium text-zinc-900">{log.item}</td>
                    <td className="py-4 px-2 font-medium text-zinc-900">{log.unit}</td> 
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${log.type === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-zinc-500">{log.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}