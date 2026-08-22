import React from 'react';

export default function KebijakanPrivasi() {
  const sections = [
    {
      id: 'pengumpulan',
      title: 'Pengumpulan Informasi',
      intro:
        'Aplikasi BSNetOps mencatat informasi tertentu milik staf/pengguna internal untuk mendukung tata kelola aset perusahaan yang akuntabel. Data yang dikumpulkan meliputi:',
      points: [
        'Identitas resmi (Nama lengkap, ID Karyawan, Jabatan, dan Email internal).',
        'Riwayat permintaan aset.',
        'Log aktivitas sistem untuk kebutuhan audit perusahaan.'
      ]
    },
    {
      id: 'penggunaan',
      title: 'Penggunaan Data',
      intro: 'Seluruh data yang tercatat dalam sistem digunakan secara eksklusif untuk kepentingan internal:',
      points: [
        'Memproses pengajuan dan validasi izin permintaan aset.',
        'Penyusunan Laporan Hasil Permintaan (LHP) inventaris berkala.',
        'Mencegah dan mendeteksi penggunaan fasilitas jaringan secara tidak sah.'
      ]
    },
    {
      id: 'keamanan',
      title: 'Keamanan & Kerahasiaan',
      intro:
        'Data disimpan dalam basis data dan terenkripsi secara aman. Kami menjamin bahwa tidak ada data pengguna yang diperjualbelikan atau disebarluaskan kepada pihak ketiga di luar instansi resmi.',
      points: []
    }
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-300/40 p-8 md:p-14">
      <div className="space-y-12 text-sm text-slate-700 leading-relaxed">
        {sections.map((s, i) => (
          <section key={s.id}>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 pb-2 mb-4 border-b-2 border-[#00664b]/15">
              {i + 1}. {s.title}
            </h2>
            <p className="text-sm leading-relaxed">{s.intro}</p>
            {s.points.length > 0 && (
              <ul className="mt-4 space-y-3">
                {s.points.map((p, idx) => (
                  <li key={idx} className="flex gap-4 text-sm">
                    <span className="text-[#00664b] font-bold shrink-0 mt-0.5">
                      {i + 1}.{idx + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}