import { NextResponse } from "next/server";
import { google } from "googleapis";

async function initSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemName, quantity, userName } = body;
    const qty = parseInt(quantity) || 1;

    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // 1. Cek Harga Jual & Harga Modal di Inventory (Kolom A sampai F)
    const invRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Inventory!A:F',
    });
    const rows = invRes.data.values || [];
    
    let hargaSatuan = 0;
    let hargaModalSatuan = 0;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === itemName) {
        hargaSatuan = parseInt(rows[i][4]) || 0; // Kolom E (Harga Jual)
        hargaModalSatuan = parseInt(rows[i][5]) || 0; // Kolom F (Harga Modal)
        break;
      }
    }

    if (hargaSatuan === 0) return NextResponse.json({ error: "Harga jual belum disetting di Kolom E!" }, { status: 400 });
    if (hargaModalSatuan === 0) return NextResponse.json({ error: "Harga modal belum disetting di Kolom F!" }, { status: 400 });

    // 2. Hitung Total Pendapatan & Total Modal
    const totalHarga = hargaSatuan * qty;
    const totalModal = hargaModalSatuan * qty;
    
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const timeStr = now.toLocaleString('id-ID');

    const epoch = new Date('2026-01-24T00:00:00+07:00').getTime();
    const nowMs = now.getTime();
    const diffInDays = Math.floor((nowMs - epoch) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffInDays / 7) + 1;



    // 3. Catat ke Log_Penjualan (Sampai Kolom G)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Log_Penjualan!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        // [Waktu, Minggu, Nama, Item, Qty, Total Pendapatan, Total Modal]
        values: [[timeStr, `Minggu ${weekNumber}`, userName, itemName, qty, totalHarga, totalModal]],
      },
    });

    return NextResponse.json({ message: "Sukses", totalHarga });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mencatat penjualan" }, { status: 500 });
  }
}