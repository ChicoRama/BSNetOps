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

  return (
    <div 
      ref={ref} 
      className="bg-white w-[210mm] min-h-[297mm] p-[12mm] text-black font-sans box-border relative mx-auto"
    >
      {/* HEADER DOKUMEN */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-zinc-800 pb-4">
        {/* Kiri: Logo & Cabang */}
        <div className="flex flex-col w-1/3">
          <img src="/images/logo-BSN.png" alt="Logo BSN" className="h-14 w-auto object-contain object-left mb-2" />
          <span className="text-sm font-semibold text-zinc-700 tracking-wide">Cabang Semarang</span>
        </div>
        
        {/* Tengah: Judul */}
        <div className="w-1/3 flex justify-center items-center">
          <h1 className="text-xl font-black uppercase tracking-widest text-center mt-2">Bon Barang</h1>
        </div>
        
        {/* Kanan: Info Unit & Tanggal */}
        <div className="w-1/3 text-sm font-medium mt-1">
          <div className="flex justify-end items-center gap-3 mb-1.5">
            <span className="text-zinc-600">Unit:</span>
            <span className="border-b border-zinc-500 w-[140px] text-right font-bold pb-0.5">
              {formData?.divisi || '-'}
            </span>
          </div>
          <div className="flex justify-end items-center gap-3">
            <span className="text-zinc-600">Tanggal:</span>
            <span className="border-b border-zinc-500 w-[140px] text-right font-bold pb-0.5">
              {tanggalCetak}
            </span>
          </div>
        </div>
      </div>

      {/* INFORMASI PEMOHON */}
      <div className="mb-6 bg-zinc-50 border border-zinc-300 p-4 rounded-lg">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Informasi & Keperluan Pemohon:</span>
        <p className="text-sm font-medium text-zinc-900 leading-relaxed italic">
          "{formData?.alasanDibutuhkan || formData?.keperluan || 'Tidak ada keterangan tambahan yang dicantumkan.'}"
        </p>
      </div>

      {/* TABEL DAFTAR BARANG */}
      <table className="w-full border-collapse border border-zinc-800 text-sm mb-8">
        <thead>
          <tr className="bg-zinc-100 text-zinc-900">
            <th rowSpan="2" className="border border-zinc-800 w-[5%] py-2.5 align-middle text-center font-bold">No.</th>
            <th rowSpan="2" className="border border-zinc-800 w-[35%] py-2.5 align-middle text-left px-3 font-bold">Nama Barang</th>
            <th colSpan="2" className="border border-zinc-800 w-[20%] py-1.5 text-center font-bold">Jumlah</th>
            <th rowSpan="2" className="border border-zinc-800 w-[40%] py-2.5 align-middle text-left px-3 font-bold">Keterangan</th>
          </tr>
          <tr className="bg-zinc-100 text-zinc-900">
            <th className="border border-zinc-800 w-[10%] py-1.5 text-xs font-bold text-center">Diminta</th>
            <th className="border border-zinc-800 w-[10%] py-1.5 text-xs font-bold text-center">Diberikan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((_, index) => {
            const barang = daftarBarang[index];
            const jumlahDiminta = barang ? (barang.jumlahDiminta || barang.jumlah || '') : '';
            const jumlahDiberikan = barang?.jumlahDisetujui !== undefined && barang?.jumlahDisetujui !== null ? barang.jumlahDisetujui : '';

            return (
              <tr key={index} className="h-[35px] even:bg-zinc-50/50">
                <td className="border border-zinc-800 text-center text-xs font-medium text-zinc-600">{index + 1}</td>
                <td className="border border-zinc-800 px-3 text-sm font-semibold capitalize text-zinc-900">{barang ? barang.namaAset : ''}</td>
                <td className="border border-zinc-800 text-center text-sm font-medium text-zinc-800">{jumlahDiminta}</td>
                <td className="border border-zinc-800 text-center text-sm font-bold text-black">{jumlahDiberikan}</td>
                <td className="border border-zinc-800 px-3 text-xs font-medium text-zinc-700 italic">
                  {barang?.keterangan || barang?.remark || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* AREA TANDA TANGAN */}
      <table className="w-full border-collapse border border-zinc-800 mt-auto text-xs text-center table-fixed">
        <thead>
          <tr className="bg-zinc-100 text-zinc-900">
            <td className="border border-zinc-800 py-2.5 font-bold uppercase tracking-wider">GA</td>
            <td className="border border-zinc-800 py-2.5 font-bold uppercase tracking-wider">Dikeluarkan Oleh</td>
            <td className="border border-zinc-800 py-2.5 font-bold uppercase tracking-wider">Disetujui (Atasan)</td>
            <td className="border border-zinc-800 py-2.5 font-bold uppercase tracking-wider">Pemohon</td>
          </tr>
        </thead>
        <tbody>
          <tr className="h-[120px]">
            
            {/* 1. KOLOM GA */}
            <td className="border border-zinc-800 align-bottom pb-4">
              <div className="flex flex-col items-center justify-end h-full w-full">
                <span className="font-semibold text-zinc-800">
                  (____________________)
                </span>
              </div>
            </td>

            {/* 2. KOLOM ADMIN (Dikeluarkan Oleh) */}
            <td className="border border-zinc-800 align-bottom pb-4 relative">
              <div className="flex flex-col items-center justify-end h-full w-full">
                {formData?.qrAdmin ? (
                  <>
                    <img 
                      src={formData.qrAdmin} 
                      alt="QR Admin" 
                      className="w-[70px] h-[70px] mb-2 object-contain mix-blend-multiply opacity-90 absolute bottom-10"
                      crossOrigin="anonymous"
                    />
                    <span className="font-bold text-zinc-900 underline underline-offset-4 decoration-1">
                      {formData?.adminName || 'Mas Agus'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-zinc-400 italic absolute bottom-14">Belum di-ACC</span>
                    <span className="font-semibold text-zinc-800">
                      (____________________)
                    </span>
                  </>
                )}
              </div>
            </td>

            {/* 3. KOLOM ATASAN / MANAGER */}
            <td className="border border-zinc-800 align-bottom pb-4 relative">
              <div className="flex flex-col items-center justify-end h-full w-full">
                {formData?.isApproved && formData?.qrManager ? (
                  <>
                    <img 
                      src={formData.qrManager} 
                      alt="QR Manager" 
                      className="w-[70px] h-[70px] mb-2 object-contain mix-blend-multiply opacity-90 absolute bottom-10"
                      crossOrigin="anonymous"
                    />
                    <span className="font-bold text-zinc-900 underline underline-offset-4 decoration-1">
                      {formData?.managerName || 'Manager'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-zinc-400 italic absolute bottom-14">Belum di-ACC</span>
                    <span className="font-semibold text-zinc-800">
                      (____________________)
                    </span>
                  </>
                )}
              </div>
            </td>
            
            {/* 4. KOLOM PEMOHON */}
            <td className="border border-zinc-800 align-bottom pb-4 relative">
              <div className="flex flex-col items-center justify-end h-full w-full">
                {formData?.namaLengkap ? (
                  <>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Requested by ${formData.namaLengkap} pada ${tanggalCetak}`)}`} 
                      alt="QR Pemohon" 
                      className="w-[70px] h-[70px] mb-2 object-contain mix-blend-multiply opacity-90 absolute bottom-10"
                      crossOrigin="anonymous"
                    />
                    <span className="font-bold text-zinc-900 underline underline-offset-4 decoration-1 capitalize truncate max-w-[90%]">
                      {formData.namaLengkap}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-zinc-800">
                    (____________________)
                  </span>
                )}
              </div>
            </td>

          </tr>
        </tbody>
      </table>
    </div>
  );
});

export default TemplateDokumenA4;