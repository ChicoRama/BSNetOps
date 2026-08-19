import React from 'react';

const TemplateDokumenA4 = React.forwardRef(({ formData, daftarBarang = [], adminData }, ref) => {
  // Minimal baris yang ditampilkan agar tabel tidak terlalu pendek jika barang hanya 1
  const MIN_ROWS = 6;
  const rowCount = Math.max(MIN_ROWS, daftarBarang.length);
  const rows = Array.from({ length: rowCount });

  // Format tanggal Indonesia (Misal: 17 Agustus 2026)
  const tanggalCetak = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const brandColor = '#00664b';

  return (
    <div 
      ref={ref} 
      className="bg-white w-[210mm] min-h-[297mm] text-black font-sans box-border relative mx-auto flex flex-col"
    >
      {/* AKSEN GARIS ATAS */}
      <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />

      <div className="p-[14mm] flex flex-col flex-1">

        {/* HEADER DOKUMEN */}
        <div className="flex justify-between items-start mb-6 pb-5 border-b-[3px]" style={{ borderColor: brandColor }}>
          {/* Kiri: Logo & Cabang */}
          <div className="flex flex-col w-1/3">
            <img src="/images/logo-BSN.png" alt="Logo BSN" className="h-14 w-auto object-contain object-left mb-2" />
            <span className="text-sm font-bold tracking-wide" style={{ color: brandColor }}>
              Bank Syariah Nasional
            </span>
            <span className="text-xs font-medium text-zinc-500">Cabang Semarang</span>
          </div>
          
          {/* Tengah: Judul */}
          <div className="w-1/3 flex flex-col justify-center items-center pt-2">
            <h1 className="text-2xl font-black uppercase tracking-widest text-center" style={{ color: brandColor }}>
              Bon Barang
            </h1>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.2em] mt-1">
              Formulir Permintaan Inventaris
            </span>
          </div>
          
          {/* Kanan: Info Unit & Tanggal */}
          <div className="w-1/3 text-sm font-medium mt-2">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Unit</span>
              <span className="text-right font-bold text-zinc-900">
                {formData?.divisi || '-'}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tanggal</span>
              <span className="text-right font-bold text-zinc-900">
                {tanggalCetak}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">No. Dokumen</span>
              <span className="text-right font-bold text-zinc-900 font-mono text-xs">
                {formData?.id || formData?.noDokumen || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* INFORMASI PEMOHON */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 bg-zinc-50 border-l-4 p-4 rounded-r-lg" style={{ borderColor: brandColor }}>
            <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: brandColor }}>
              Keperluan / Alasan Permintaan
            </span>
            <p className="text-sm font-medium text-zinc-800 leading-relaxed">
              {formData?.alasanDibutuhkan || formData?.keperluan || 'Tidak ada keterangan tambahan yang dicantumkan.'}
            </p>
          </div>
          <div className="w-[180px] bg-zinc-50 border-l-4 border-zinc-300 p-4 rounded-r-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1">
              Pemohon
            </span>
            <p className="text-sm font-bold text-zinc-900 capitalize leading-tight">
              {formData?.namaLengkap || '-'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {formData?.status || ''}
            </p>
          </div>
        </div>

        {/* TABEL DAFTAR BARANG */}
        <table className="w-full border-collapse text-sm mb-8 overflow-hidden rounded-lg" style={{ border: `1.5px solid ${brandColor}` }}>
          <thead>
            <tr style={{ backgroundColor: brandColor }} className="text-white">
              <th rowSpan="2" className="border border-white/20 w-[5%] py-3 align-middle text-center font-bold text-xs uppercase tracking-wide">No.</th>
              <th rowSpan="2" className="border border-white/20 w-[35%] py-3 align-middle text-left px-3 font-bold text-xs uppercase tracking-wide">Nama Barang</th>
              <th colSpan="2" className="border border-white/20 w-[20%] py-2 text-center font-bold text-xs uppercase tracking-wide">Jumlah</th>
              <th rowSpan="2" className="border border-white/20 w-[40%] py-3 align-middle text-left px-3 font-bold text-xs uppercase tracking-wide">Keterangan</th>
            </tr>
            <tr style={{ backgroundColor: brandColor }} className="text-white">
              <th className="border border-white/20 w-[10%] py-1.5 text-[10px] font-bold text-center uppercase tracking-wide">Diminta</th>
              <th className="border border-white/20 w-[10%] py-1.5 text-[10px] font-bold text-center uppercase tracking-wide">Diberikan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((_, index) => {
              const barang = daftarBarang[index];
              const jumlahDiminta = barang ? (barang.jumlahDiminta || barang.jumlah || '') : '';
              const jumlahDiberikan = barang?.jumlahDisetujui !== undefined && barang?.jumlahDisetujui !== null ? barang.jumlahDisetujui : '';

              return (
                <tr key={index} className="h-[34px] even:bg-zinc-50">
                  <td className="border border-zinc-200 text-center text-xs font-medium text-zinc-500">{index + 1}</td>
                  <td className="border border-zinc-200 px-3 text-sm font-semibold capitalize text-zinc-900">{barang ? barang.namaAset : ''}</td>
                  <td className="border border-zinc-200 text-center text-sm font-medium text-zinc-700">{jumlahDiminta}</td>
                  <td className="border border-zinc-200 text-center text-sm font-bold" style={{ color: jumlahDiberikan !== '' ? brandColor : 'inherit' }}>{jumlahDiberikan}</td>
                  <td className="border border-zinc-200 px-3 text-xs font-medium text-zinc-500 italic">
                    {barang?.keterangan || barang?.remark || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* AREA TANDA TANGAN */}
        <div className="mt-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">
            Verifikasi & Persetujuan
          </span>
          <table className="w-full border-collapse text-xs text-center table-fixed rounded-lg overflow-hidden" style={{ border: `1.5px solid ${brandColor}` }}>
            <thead>
              <tr style={{ backgroundColor: brandColor }} className="text-white">
                <td className="border border-white/20 py-2.5 font-bold uppercase tracking-wider">GA</td>
                <td className="border border-white/20 py-2.5 font-bold uppercase tracking-wider">Dikeluarkan Oleh</td>
                <td className="border border-white/20 py-2.5 font-bold uppercase tracking-wider">Disetujui (Atasan)</td>
                <td className="border border-white/20 py-2.5 font-bold uppercase tracking-wider">Pemohon</td>
              </tr>
            </thead>
            <tbody>
              <tr className="h-[125px]">
                
                {/* 1. KOLOM GA */}
                <td className="border border-zinc-200 align-bottom pb-4 bg-zinc-50/50">
                  <div className="flex flex-col items-center justify-end h-full w-full">
                    <span className="font-semibold text-zinc-400 text-[11px]">
                      (____________________)
                    </span>
                  </div>
                </td>

                {/* 2. KOLOM ADMIN (Dikeluarkan Oleh) */}
                <td className="border border-zinc-200 align-bottom pb-4 relative bg-zinc-50/50">
                  <div className="flex flex-col items-center justify-end h-full w-full">
                    {formData?.qrAdmin ? (
                      <>
                        <img 
                          src={formData.qrAdmin} 
                          alt="QR Admin" 
                          className="w-[68px] h-[68px] mb-2 object-contain mix-blend-multiply opacity-90 absolute bottom-10"
                          crossOrigin="anonymous"
                        />
                        <span className="font-bold text-zinc-900 underline underline-offset-4 decoration-1" style={{ textDecorationColor: brandColor }}>
                          {formData?.adminName || 'Mas Agus'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-amber-600 italic font-semibold absolute bottom-14">Belum di-ACC</span>
                        <span className="font-semibold text-zinc-400 text-[11px]">
                          (____________________)
                        </span>
                      </>
                    )}
                  </div>
                </td>

                {/* 3. KOLOM ATASAN / MANAGER */}
                <td className="border border-zinc-200 align-bottom pb-4 relative bg-zinc-50/50">
                  <div className="flex flex-col items-center justify-end h-full w-full">
                    {formData?.isApproved && formData?.qrManager ? (
                      <>
                        <img 
                          src={formData.qrManager} 
                          alt="QR Manager" 
                          className="w-[68px] h-[68px] mb-2 object-contain mix-blend-multiply opacity-90 absolute bottom-10"
                          crossOrigin="anonymous"
                        />
                        <span className="font-bold text-zinc-900 underline underline-offset-4 decoration-1" style={{ textDecorationColor: brandColor }}>
                          {formData?.managerName || 'Manager'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-amber-600 italic font-semibold absolute bottom-14">Belum di-ACC</span>
                        <span className="font-semibold text-zinc-400 text-[11px]">
                          (____________________)
                        </span>
                      </>
                    )}
                  </div>
                </td>
                
                {/* 4. KOLOM PEMOHON */}
                <td className="border border-zinc-200 align-bottom pb-4 relative bg-zinc-50/50">
                  <div className="flex flex-col items-center justify-end h-full w-full">
                    {formData?.namaLengkap ? (
                      <>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Requested by ${formData.namaLengkap} pada ${tanggalCetak}`)}`} 
                          alt="QR Pemohon" 
                          className="w-[68px] h-[68px] mb-2 object-contain mix-blend-multiply opacity-90 absolute bottom-10"
                          crossOrigin="anonymous"
                        />
                        <span className="font-bold text-zinc-900 underline underline-offset-4 decoration-1 capitalize truncate max-w-[90%]" style={{ textDecorationColor: brandColor }}>
                          {formData.namaLengkap}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-zinc-400 text-[11px]">
                        (____________________)
                      </span>
                    )}
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        {/* FOOTER DOKUMEN */}
        <div className="mt-6 pt-3 border-t border-zinc-200 flex justify-between items-center">
          <span className="text-[9px] text-zinc-400">
            Dokumen ini dicetak otomatis oleh sistem BSNetOps — {tanggalCetak}
          </span>
          <span className="text-[9px] font-bold" style={{ color: brandColor }}>
            BSNetOps
          </span>
        </div>

      </div>
    </div>
  );
});

export default TemplateDokumenA4;