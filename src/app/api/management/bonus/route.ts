import { NextResponse } from 'next/server';
import { google } from 'googleapis';

async function initSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffName, keterangan, jumlah, minggu, pic } = body;
    
    if (!jumlah || jumlah <= 0) return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });

    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Catat ke Tab Log_Bonus
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Log_Bonus!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timeStr, minggu, staffName, keterangan, jumlah]] },
    });

    return NextResponse.json({ message: "Bonus berhasil dicairkan!" });
  } catch (error: any) {
    return NextResponse.json({ error: "Gagal mencatat bonus" }, { status: 500 });
  }
}