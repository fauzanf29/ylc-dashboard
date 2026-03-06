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
    const { kategori, keterangan, jumlah, userName } = body;

    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const timeStr = now.toLocaleString('id-ID');
    const epoch = new Date('2026-01-24T00:00:00+07:00').getTime();
    const nowMs = now.getTime();
    const diffInDays = Math.floor((nowMs - epoch) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffInDays / 7) + 1;


    // Catat ke tab Log_Pengeluaran
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Log_Pengeluaran!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timeStr, `Minggu ${weekNumber}`, userName, kategori, keterangan, jumlah]],
      },
    });

    return NextResponse.json({ message: "Pengeluaran Berhasil Dicatat" });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mencatat pengeluaran" }, { status: 500 });
  }
}