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
        height: '297mm',
        padding: '10mm 12mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        margin: '0 auto',
        overflow: 'hidden'
      }}
    >
      {/* HEADER DOKUMEN */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', borderBottom: '2px solid #000000', paddingBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', verticalAlign: 'top' }}>
              <img 
                src="/images/logo-BSN.png" 
                alt="Logo BSN" 
                style={{ height: '38px', width: 'auto', display: 'block', marginBottom: '4px' }} 
              />
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#3f3f46' }}>Cabang Semarang</div>
            </td>
            <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'middle' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>BON BARANG</h1>
            </td>
            <td style={{ width: '30%', verticalAlign: 'top', fontSize: '11px', fontWeight: '500' }}>
              <div style={{ textAlign: 'right', marginBottom: '4px' }}>
                <span style={{ color: '#52525b', marginRight: '8px' }}>Unit:</span>
                <span style={{ borderBottom: '1px solid #71717a', display: 'inline-block', width: '110px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formData?.divisi || '-'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#52525b', marginRight: '8px' }}>Tanggal:</span>
                <span style={{ borderBottom: '1px solid #71717a', display: 'inline-block', width: '110px', textAlign: 'right', fontWeight: 'bold' }}>
                  {tanggalCetak}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* INFORMASI PEMOHON */}
      <div style={{ marginBottom: '12px', backgroundColor: '#f4f4f5', border: '1px solid #d4d4d8', padding: '8px 12px', borderRadius: '4px' }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
          Informasi & Keperluan Pemohon:
        </div>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#18181b', fontStyle: 'italic' }}>
          "{formData?.alasanDibutuhkan || formData?.keperluan || 'Tidak ada keterangan tambahan yang dicantumkan.'}"
        </div>
      </div>

      {/* TABEL DAFTAR BARANG (HEADER 1 BARIS TANPA ROWSPAN/COLSPAN -> SOLUSI BEBAS BUG) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px', marginBottom: '16px' }}>
        <tbody>
          <tr style={{ backgroundColor: '#f4f4f5', height: '32px' }}>
            <td style={{ border: '1px solid #000000', width: '7%', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
              No.
            </td>
            <td style={{ border: '1px solid #000000', width: '38%', padding: '0 8px', textAlign: 'left', fontWeight: 'bold', verticalAlign: 'middle' }}>
              Nama Barang
            </td>
            <td style={{ border: '1px solid #000000', width: '13%', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '10px' }}>
              Diminta
            </td>
            <td style={{ border: '1px solid #000000', width: '13%', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '10px' }}>
              Diberikan
            </td>
            <td style={{ border: '1px solid #000000', width: '29%', padding: '0 8px', textAlign: 'left', fontWeight: 'bold', verticalAlign: 'middle' }}>
              Keterangan
            </td>
          </tr>

          {rows.map((_, index) => {
            const barang = daftarBarang[index];
            const jumlahDiminta = barang ? (barang.jumlahDiminta || barang.jumlah || '') : '';
            const jumlahDiberikan = barang?.jumlahDisetujui !== undefined && barang?.jumlahDisetujui !== null ? barang.jumlahDisetujui : '';

            return (
              <tr key={index} style={{ height: '28px', backgroundColor: index % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                <td style={{ border: '1px solid #000000', textAlign: 'center', color: '#52525b', verticalAlign: 'middle' }}>{index + 1}</td>
                <td style={{ border: '1px solid #000000', padding: '0 8px', fontWeight: '600', color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
                  {barang ? barang.namaAset : ''}
                </td>
                <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: '500', verticalAlign: 'middle' }}>{jumlahDiminta}</td>
                <td style={{ border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{jumlahDiberikan}</td>
                <td style={{ border: '1px solid #000000', padding: '0 8px', fontSize: '10px', color: '#3f3f46', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
                  {barang?.keterangan || barang?.remark || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* AREA TANDA TANGAN */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #000000', fontSize: '10px', textAlign: 'center' }}>
        <tbody>
          <tr style={{ backgroundColor: '#f4f4f5', height: '24px' }}>
            <td style={{ border: '1px solid #000000', fontWeight: 'bold', width: '25%', verticalAlign: 'middle' }}>GA</td>
            <td style={{ border: '1px solid #000000', fontWeight: 'bold', width: '25%', verticalAlign: 'middle' }}>DIKELUARKAN OLEH</td>
            <td style={{ border: '1px solid #000000', fontWeight: 'bold', width: '25%', verticalAlign: 'middle' }}>DISETUJUI (ATASAN)</td>
            <td style={{ border: '1px solid #000000', fontWeight: 'bold', width: '25%', verticalAlign: 'middle' }}>PEMOHON</td>
          </tr>
          <tr style={{ height: '85px' }}>
            {/* GA */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '8px' }}>
              (____________________)
            </td>

            {/* ADMIN */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '8px' }}>
              {formData?.qrAdmin ? (
                <div>
                  <img src={formData.qrAdmin} alt="QR Admin" style={{ width: '45px', height: '45px', margin: '0 auto 4px auto', display: 'block' }} />
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formData?.adminName || 'Admin'}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '9px', color: '#a1a1aa', fontStyle: 'italic', marginBottom: '12px' }}>Belum di-ACC</div>
                  <div>(____________________)</div>
                </div>
              )}
            </td>

            {/* MANAGER */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '8px' }}>
              {formData?.isApproved && formData?.qrManager ? (
                <div>
                  <img src={formData.qrManager} alt="QR Manager" style={{ width: '45px', height: '45px', margin: '0 auto 4px auto', display: 'block' }} />
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{formData?.managerName || 'Manager'}</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '9px', color: '#a1a1aa', fontStyle: 'italic', marginBottom: '12px' }}>Belum di-ACC</div>
                  <div>(____________________)</div>
                </div>
              )}
            </td>

            {/* PEMOHON */}
            <td style={{ border: '1px solid #000000', verticalAlign: 'bottom', paddingBottom: '8px' }}>
              {formData?.namaLengkap ? (
                <div>
                  <div style={{ display: 'inline-block', marginBottom: '4px' }}>
                    <QRCodeSVG 
                      value={`Requested by ${formData.namaLengkap} pada ${tanggalCetak}`} 
                      size={45} 
                    />
                  </div>
                  <div style={{ fontWeight: 'bold', textDecoration: 'underline', textTransform: 'capitalize' }}>
                    {formData.namaLengkap}
                  </div>
                </div>
              ) : (
                <div>(____________________)</div>
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