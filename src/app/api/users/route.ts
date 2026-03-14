import { NextResponse } from "next/server";
import { google } from "googleapis";

// Fungsi inisialisasi koneksi ke Google Sheets (Sama persis kayak di Inventory)
async function initSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function GET() {
  try {
    const sheets = await initSheets();
    
    // Tarik data dari Tab 'Users'
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Users!A2:C', // Asumsi Kolom A=Discord_ID, B=Nama_RP, C=Role
    });
    
    const rows = response.data.values || [];
    
    // Mapping datanya jadi format JSON yang gampang dibaca
    const users = rows.map(row => ({
      Discord_ID: row[0] || "",
      Nama_RP: row[1] || "",
      Role: row[2] || ""
    }));
    
    return NextResponse.json(users);
  } catch (error) {
    console.error("Gagal memuat users:", error);
    return NextResponse.json({ error: "Gagal memuat users" }, { status: 500 });
  }
}