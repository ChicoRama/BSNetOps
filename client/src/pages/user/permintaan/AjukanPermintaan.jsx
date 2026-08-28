import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TemplateDokumenA4 = React.forwardRef(({ formData, daftarBarang = [], adminData }, ref) => {
  const MIN_ROWS = 6;
  const rowCount = Math.max(MIN_ROWS, daftarBarang.length);
  const rows = Array.from({ length: rowCount });

  const tanggalCetak = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      ref={ref} 
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        width: '210mm',
        height: '296mm',
        padding: '12mm',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        margin: '0 auto',
        position: 'relative'
      }}
    >
      {/* HEADER DOKUMEN */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', borderBottom: '2px solid #000000', paddingBottom: '12px' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', verticalAlign: 'top' }}>
              <img 
                src="/images/logo-BSN.png" 
                alt="Logo BSN" 
                style={{ height: '45px', width: 'auto', display: 'block', marginBottom: '6px' }} 
              />
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#3f3f46' }}>Cabang Semarang</span>
            </td>
            <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'middle' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>Bon Barang</h1>
            </td>
            <td style={{ width: '30%', verticalAlign: 'top', fontSize: '12px', fontWeight: '500' }}>
              <div style={{ textAlign: 'right', marginBottom: '4px' }}>
                <span style={{ color: '#52525b', marginRight: '8px' }}>Unit:</span>
                <span style={{ borderBottom: '1px solid #71717a', display: 'inline-block', width: '120px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formData?.divisi || '-'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#52525b', marginRight: '8px' }}>Tanggal:</span>
                <span style={{ borderBottom: '1px solid #71717a', display: 'inline-block', width: '120px', textAlign: 'right', fontWeight: 'bold' }}>
                  {tanggalCetak}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* INFORMASI PEMOHON */}
      <div style={{ marginBottom: '16px', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', padding: '10px 14px', borderRadius: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
          Informasi & Keperluan Pemohon:
        </div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#18181b', fontStyle: 'italic' }}>
          "{formData?.alasanDibutuhkan || formData?.keperluan || 'Tidak ada keterangan tambahan yang dicantumkan.'}"
        </div>
      </div>

      {/* TABEL DAFTAR BARANG (HEADER 1 BARIS TANPA ROWSPAN UNTUK MENCEGAH TEKS HILANG INI) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f5' }}>
            <th style={{ border: '1px solid #000000', width: '8%', padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
              No.
            </th>
            <th style={{ border: '1px solid #000000', width: '37%', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 'bold' }}>
              Nama Barang
            </th>
            <th style={{ border: '1px solid #000000', width: '10%', padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
              Jml. Diminta
            </th>
            <th style={{ border: '1px solid #000000', width: '10%', padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
              Jml. Diberikan
            </th>
            <th style={{ border: '1px solid #000000', width: '35%', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 'bold' }}>
              Keterangan
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((_, index) => {
            const barang = daftarBarang[index];
            const jumlahDiminta = barang ? (barang.jumlahDiminta || barang.jumlah || '') : '';
            const jumlahDiberikan = barang?.jumlahDisetujui !== undefined && barang?.jumlahDisetujui !== null ? barang.jumlahDisetujui : '';

            return (
              <tr key={index} style={{ height: '32px', backgroundColor: index % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                <td style={{ border: '1px solid #000000', textAlign: 'center', color: '#52525b' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000000', padding: '0 10px', fontWeight: '600', color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {barang ? barang.namaAset : ''}
                </td>
                <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: '500' }}>{jumlahDiminta}</td>
                <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold' }}>{jumlahDiberikan}</td>
                <td style={{ border: '1px solid #000000', padding: '0 10px', fontSize: '11px', color: '#3f3f46', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {barang?.keterangan || barang?.remark || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* AREA TANDA TANGAN */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #000000', fontSize: '11px', textAlign: 'center', position: 'absolute', bottom: '12mm', left: '12mm', right: '12mm', width: 'calc(100% - 24mm)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f5' }}>
            <th style={{ border: '1px solid #000000', padding: '6px 0', fontWeight: 'bold', width: '25%' }}>GA</th>
            <th style={{ border: '1px solid #000000', padding: '6px 0', fontWeight: 'bold', width: '25%' }}>DIKELUARKAN OLEH</th>
            <th style={{ border: '1px solid #000000', padding: '6px 0', fontWeight: 'bold', width: '25%' }}>DISETUJUI (ATASAN)</th>
            <th style={{ border: '1px solid #000000', padding: '6px 0', fontWeight: 'bold', width: '25%' }}>PEMOHON</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: '95px' }}>
            {/* GA */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '10px' }}>
              (____________________)
            </td>

            {/* ADMIN */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '10px' }}>
              {formData?.qrAdmin ? (
                <div>
                  <img src={formData.qrAdmin} alt="QR Admin" style={{ width: '50px', height: '50px', margin: '0 auto 4px auto', display: 'block' }} />
                  <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formData?.adminName || 'Mas Agus'}</span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '10px', color: '#a1a1aa', fontStyle: 'italic', marginBottom: '15px' }}>Belum di-ACC</div>
                  <span>(____________________)</span>
                </div>
              )}
            </td>

            {/* MANAGER */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '10px' }}>
              {formData?.isApproved && formData?.qrManager ? (
                <div>
                  <img src={formData.qrManager} alt="QR Manager" style={{ width: '50px', height: '50px', margin: '0 auto 4px auto', display: 'block' }} />
                  <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formData?.managerName || 'Manager'}</span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '10px', color: '#a1a1aa', fontStyle: 'italic', marginBottom: '15px' }}>Belum di-ACC</div>
                  <span>(____________________)</span>
                </div>
              )}
            </td>

            {/* PEMOHON */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '10px' }}>
              {formData?.namaLengkap ? (
                <div>
                  <div style={{ margin: '0 auto 4px auto', width: '50px', height: '50px' }}>
                    <QRCodeSVG value={`Requested by ${formData.namaLengkap} pada ${tanggalCetak}`} size={50} />
                  </div>
                  <span style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'capitalize' }}>{formData.namaLengkap}</span>
                </div>
              ) : (
                <span>(____________________)</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

TemplateDokumenA4.displayName = 'TemplateDokumenA4';

export default TemplateDokumenA4;