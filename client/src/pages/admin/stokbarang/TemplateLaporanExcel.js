import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

export const generateLaporanExcel = async (opnameData, namaPeriode, toastId) => {
  try {
    const totalBaris = opnameData.length;

    // 1. Tambahkan Baris Grand Total di bagian bawah
    opnameData.push({
      no: '', kode: '', nama: 'TOTAL KESELURUHAN', kategori: '',
      awal: opnameData.reduce((s, i) => s + (Number(i.awal) || 0), 0),
      masuk: opnameData.reduce((s, i) => s + (Number(i.masuk) || 0), 0),
      keluar: opnameData.reduce((s, i) => s + (Number(i.keluar) || 0), 0),
      akhir: opnameData.reduce((s, i) => s + (Number(i.akhir) || 0), 0),
    });

    // 2. Inisialisasi Workbook & Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Rekap ${namaPeriode.replace('_', ' ')}`);

    // 3. Setup Kolom Tabel
    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Kode Barang', key: 'kode', width: 16 },
      { header: 'Nama Barang', key: 'nama', width: 32 },
      { header: 'Kategori', key: 'kategori', width: 22 },
      { header: 'Stok Awal', key: 'awal', width: 15 },
      { header: 'Barang Masuk', key: 'masuk', width: 16 },
      { header: 'Barang Keluar', key: 'keluar', width: 16 },
      { header: 'Stok Akhir', key: 'akhir', width: 15 }
    ];

    // 4. Masukkan Data ke Worksheet
    worksheet.addRows(opnameData);

    // 5. Desain Header (Warna Hijau BSN)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00664B' } 
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 6. Desain Border dan Rata Kiri/Tengah untuk Isi Tabel
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (rowNumber > 1) {
          if (colNumber === 3) { // Nama Barang
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else { // Sisanya
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
      });
    });

    // 7. Desain Baris Total Keseluruhan (Warna Kuning)
    const lastRow = worksheet.getRow(totalBaris + 2); 
    lastRow.font = { bold: true };
    lastRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFDE047' } 
    };

    // 8. Cetak File dan Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Laporan_Opname_${namaPeriode}.xlsx`);
    
    toast.success(`Laporan ${namaPeriode.replace('_', ' ')} berhasil diunduh!`, { id: toastId });

  } catch (error) {
    throw new Error('Gagal menyusun template Excel: ' + error.message);
  }
};