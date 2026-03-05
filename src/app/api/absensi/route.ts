import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { namaStaff, action } = body;

    // 1. Siapkan Kunci Google Sheets
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const sheetName = 'Absensi'; // PASTIKAN NAMA TAB DI GSHEET ADALAH 'Absensi'

    // 2. Siapkan Waktu saat ini (WIB - Asia/Jakarta)
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const dateStr = now.toLocaleDateString('id-ID'); // Format: DD/MM/YYYY
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false }); // Format: HH:MM:SS
    
    // Hitung Minggu Ke-berapa tahun ini
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + days) / 7);

    if (action === 'checkin') {
      // PROSES CHECK IN: Buat baris baru
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:F`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[dateStr, `Minggu ${weekNumber}`, namaStaff, timeStr, "", ""]],
        },
      });
      return NextResponse.json({ message: "Check In Berhasil" });
    } 
    
    else if (action === 'checkout') {
      // PROSES CHECK OUT: Cari baris yang belum check out
      const getRows = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:F`,
      });
      const rows = getRows.data.values || [];
      
      // Cari dari bawah ke atas, baris mana milik staff ini yang CheckOut-nya (Kolom E / index 4) masih kosong
      let rowIndexToUpdate = -1;
      let checkInTime = "";
      
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][2] === namaStaff && (!rows[i][4] || rows[i][4] === "")) {
          rowIndexToUpdate = i + 1; // +1 karena index array mulai dari 0, baris Gsheet mulai dari 1
          checkInTime = rows[i][3]; // Ambil jam CheckIn
          break;
        }
      }

        if (rowIndexToUpdate !== -1) {
        // PERBAIKAN DI SINI: Kita ganti semua titik menjadi titik dua sebelum dihitung
        const safeCheckInTime = checkInTime.replace(/\./g, ':');
        const safeOutTime = timeStr.replace(/\./g, ':');

        const inParts = safeCheckInTime.split(':').map(Number);
        const outParts = safeOutTime.split(':').map(Number);
        
        let totalHours = (outParts[0] - inParts[0]) + (outParts[1] - inParts[1])/60;
        if (totalHours < 0) totalHours += 24; // Jika kerja lewat tengah malam (shift malam)
        
        const totalKerjaStr = totalHours.toFixed(2) + " Jam";

        // Update baris tersebut dengan Jam CheckOut dan Total Jam Kerja
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!E${rowIndexToUpdate}:F${rowIndexToUpdate}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[timeStr, totalKerjaStr]],
          },
        });
        return NextResponse.json({ message: "Check Out Berhasil" });
      } else {
        return NextResponse.json({ error: "Tidak menemukan data Check In yang menggantung" }, { status: 400 });
      }
    }

  } catch (error) {
    console.error("Absensi Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}