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

    // 1. Cek Harga di Inventory (Kita tetap butuh harganya)
    const invRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Inventory!A:E',
    });
    const rows = invRes.data.values || [];
    
    let hargaSatuan = 0;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === itemName) {
        hargaSatuan = parseInt(rows[i][4]) || 0; // Baca Kolom E
        break;
      }
    }

    if (hargaSatuan === 0) return NextResponse.json({ error: "Harga belum disetting di Kolom E Inventory!" }, { status: 400 });

    // 2. Hitung Total Pendapatan
    const totalHarga = hargaSatuan * qty;
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const timeStr = now.toLocaleString('id-ID');

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + days) / 7);

    // 3. HANYA Catat Duit Masuk ke Log_Penjualan (Tidak ubah stok)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Log_Penjualan!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timeStr, `Minggu ${weekNumber}`, userName, itemName, qty, totalHarga]],
      },
    });

    return NextResponse.json({ message: "Sukses", totalHarga });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mencatat penjualan" }, { status: 500 });
  }
}