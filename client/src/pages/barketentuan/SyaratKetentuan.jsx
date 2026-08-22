import React from 'react';

export default function SyaratKetentuan() {
  const sections = [
    {
      id: 'pasal-1',
      title: '1. Ketentuan Umum',
      intro: 'Dalam syarat dan ketentuan ini, yang dimaksud dengan:',
      points: [
        'Sistem BSNetOps adalah platform manajemen inventaris dan operasional jaringan internal milik Bank Syariah Nasional.',
        'Pengguna adalah pihak terotorisasi yang memiliki hak akses terdaftar ke dalam sistem BSNetOps.',
        'Aset adalah seluruh barang yang terdaftar di dalam katalog inventaris operasional.'
      ]
    },
    {
      id: 'pasal-2',
      title: '2. Hak dan Kewajiban Pengguna',
      intro: 'Setiap pengguna yang terdaftar pada sistem memiliki hak dan kewajiban sebagai berikut:',
      points: [
        'Hak: Pengguna berhak mengajukan permohonan permintaan aset sesuai dengan kebutuhan operasional pekerjaan divisi masing-masing.',
        'Kewajiban: Pengguna wajib menjaga kerahasiaan kredensial akun dan dilarang memindahtangankannya kepada pihak lain.',
        'Kewajiban: Pengguna wajib menjaga dan menggunakan barang yang diminta sesuai kegunaannya serta dilarang untuk menyalahgunakan barang tersebut.'
      ]
    }
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-300/40 p-8 md:p-14">
      <div className="space-y-12 text-sm text-slate-700 leading-relaxed">
        {sections.map((s, i) => (
          <section key={s.id}>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 pb-2 mb-4 border-b-2 border-[#00664b]/15">
              {s.title}
            </h2>
            <p className="text-sm leading-relaxed mb-4">{s.intro}</p>
            {s.points.length > 0 && (
              <ul className="space-y-3">
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