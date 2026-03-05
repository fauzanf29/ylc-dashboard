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

export async function GET() {
  try {
    const sheets = await initSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Inventory!A2:D',
    });
    
    const rows = response.data.values || [];
    const items = rows.map(row => ({
      name: row[0],
      stock: parseInt(row[1]) || 0,
    }));
    
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat inventory" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemName, action, userName, quantity } = body;
    const qty = parseInt(quantity) || 1; // Tangkap jumlah inputan

    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // 1. Cek Stok Saat Ini
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Inventory!A:D',
    });
    const rows = response.data.values || [];
    let rowIndex = -1;
    let currentStock = 0;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === itemName) {
        rowIndex = i + 1; 
        currentStock = parseInt(rows[i][1]) || 0;
        break;
      }
    }

    if (rowIndex === -1) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });

    // 2. Kalkulasi Matematika
    let newStock = currentStock;
    if (action === 'taruh') newStock += qty;
    if (action === 'ambil') {
      if (currentStock < qty) return NextResponse.json({ error: `Stok tidak cukup! Sisa: ${currentStock}` }, { status: 400 });
      newStock -= qty;
    }

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const timeStr = now.toLocaleString('id-ID');

    // 3. Update Angka di Tab Utama (Inventory)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Inventory!B${rowIndex}:D${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newStock, timeStr, userName]] },
    });

    // 4. Catat Transaksi di Tab Log_Inventory
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Log_Inventory!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timeStr, userName, itemName, action.toUpperCase(), qty, newStock]],
      },
    });

    return NextResponse.json({ message: "Sukses", newStock });
  } catch (error) {
    return NextResponse.json({ error: "Gagal update stok" }, { status: 500 });
  }
}