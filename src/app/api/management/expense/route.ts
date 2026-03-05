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
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((now.getDay() + 1 + days) / 7);

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