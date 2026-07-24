import React from 'react';

const TemplateDokumenA4 = React.forwardRef(({ formData, daftarBarang = [], adminData }, ref) => {
  const MIN_ROWS = 5;
  const rowCount = Math.max(MIN_ROWS, daftarBarang.length);
  const rows = Array.from({ length: rowCount });

  const tanggalCetak = new Date().toLocaleDateString('id-ID');

  return (
    <div 
      ref={ref} 
      className="bg-white w-[210mm] h-[297mm] p-[10mm] text-black font-sans box-border"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
        <div className="flex flex-col">
          <img src="/images/logo-BSN.png" alt="Logo BSN" className="h-20 w-auto object-contain mb-1" />
          <div className="flex flex-col">
            <span className="text-[15px] font-puppy text-middle mt-2">Cabang Semarang</span>
          </div>
        </div>
        
        <h1 className="text-xl font-bold uppercase underline underline-offset-4 decoration-2 mt-2">Bon Barang</h1>
        
        <div className="text-[12px] w-[200px] text-right font-bold mt-2">
          <div className="flex justify-end items-center gap-2">
            <span>Unit:</span>
            <span className="border-b border-black w-[120px] inline-block text-center">
              {formData?.divisi || ''}
            </span>
          </div>
          <div className="flex justify-end items-center gap-2 mt-2">
            <span>Tanggal:</span>
            <span className="border-b border-black w-[120px] inline-block text-center">
              {tanggalCetak}
            </span>
          </div>
        </div>
      </div>

      {/* INFORMASI PEMOHON (Keterangan/Keperluan dari user ditampilkan di sini) */}
      <div className="mb-4 text-xs border border-black p-2.5 rounded bg-gray-50/50">
        <span className="font-bold underline block mb-1">Informasi & Keperluan Pemohon:</span>
        <p className="italic text-gray-800 leading-relaxed">
          "{formData?.alasanDibutuhkan || formData?.keperluan || 'Tidak ada keterangan tambahan.'}"
        </p>
      </div>

{/* TABEL BARANG */}
      <table className="w-full border-collapse border-2 border-black text-sm mb-6">
        <thead>
          <tr className="bg-gray-100 font-bold">
            <th rowSpan="2" className="border-2 border-black w-[5%] py-2 align-middle">No.</th>
            <th rowSpan="2" className="border-2 border-black w-[35%] py-2 align-middle">Nama Barang</th>
            <th colSpan="2" className="border-2 border-black w-[20%] py-1">Jumlah</th>
            <th rowSpan="2" className="border-2 border-black w-[40%] py-2 align-middle">Keterangan</th>
          </tr>
          <tr className="bg-gray-100 font-bold">
            <th className="border-2 border-black w-[10%] py-1 text-xs">Diminta</th>
            <th className="border-2 border-black w-[10%] py-1 text-xs">Diberikan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((_, index) => {
            const barang = daftarBarang[index];
            
            // Logika cerdas untuk membaca data dari User vs Admin
            const jumlahDiminta = barang ? (barang.jumlahDiminta || barang.jumlah || '') : '';
            const jumlahDiberikan = barang?.jumlahDisetujui !== undefined && barang?.jumlahDisetujui !== null ? barang.jumlahDisetujui : '';

            return (
              <tr key={index} className="h-[40px]">
                <td className="border-2 border-black text-center font-bold">{index + 1}</td>
                <td className="border-2 border-black px-3 capitalize font-semibold">{barang ? barang.namaAset : ''}</td>
                <td className="border-2 border-black text-center font-bold">{jumlahDiminta}</td>
                <td className="border-2 border-black text-center font-bold text-[#00664b]">
                  {jumlahDiberikan}
                </td>
                <td className="border-2 border-black px-2 text-xs font-medium text-gray-800">
                  {barang?.keterangan || barang?.remark || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* TANDA TANGAN */}
      <table className="w-full border-collapse border-2 border-black mt-2 text-[10px] font-bold text-center table-fixed">
        <thead>
          <tr className="bg-gray-100">
            <td className="border-2 border-black py-2">GA</td>
            <td className="border-2 border-black py-2">Barang telah dikeluarkan oleh</td>
            <td className="border-2 border-black py-2">Atasan</td>
            <td className="border-2 border-black py-2">Pemohon</td>
          </tr>
        </thead>
        <tbody>
          <tr className="h-[100px]">
            
            <td className="border-2 border-black align-bottom pb-2"></td>

            {/* KOLOM BARANG TELAH DIKELUARKAN OLEH (QR Pak Agus) */}
            <td className="border-2 border-black align-bottom pb-2">
              <div className="flex flex-col items-center justify-end h-full w-full">
                {adminData?.isDiserahkan && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Released by Mas Agus pada ${adminData.tanggal}`)}`} 
                    alt="QR Admin Agus" 
                    className="w-16 h-14 mb-1 object-contain opacity-90"
                    crossOrigin="anonymous"
                  />
                )}
                <span className="capitalize font-bold text-xs mt-1">
                  {adminData?.isDiserahkan ? 'Agus' : ''}
                </span>
              </div>
            </td>

            <td className="border-2 border-black align-bottom pb-2"></td>
            
            {/* KOLOM PEMOHON (QR Pemohon) */}
            <td className="border-2 border-black align-bottom pb-2">
              <div className="flex flex-col items-center justify-end h-full w-full">
                {formData?.namaLengkap && (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`Requested by ${formData.namaLengkap} pada ${tanggalCetak}`)}`} 
                    alt="QR Signature" 
                    className="w-16 h-14 mb-1 object-contain opacity-90"
                    crossOrigin="anonymous"
                  />
                )}
                <span className="capitalize font-bold text-xs mt-1">
                  {formData?.namaLengkap}
                </span>
              </div>
            </td>

          </tr>
        </tbody>
      </table>
    </div>
  );
});

export default TemplateDokumenA4;