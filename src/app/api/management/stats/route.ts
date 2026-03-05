import { NextResponse } from "next/server";
import { google } from "googleapis";

async function initSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetWeek = searchParams.get('week'); 

    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // Ambil data Penjualan, Pengeluaran, dan Absensi
    const [salesRes, expenseRes, absensiRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Penjualan!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Pengeluaran!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Absensi!A2:F' })
    ]);

    const salesRows = salesRes.data.values || [];
    const expenseRows = expenseRes.data.values || [];
    const absensiRows = absensiRes.data.values || [];

    // --- HITUNG TOTAL KAS (GLOBAL - TIDAK TERPENGARUH WEEK) ---
    let globalBruto = 0;
    salesRows.forEach(row => globalBruto += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0));
    let globalExpense = 0;
    expenseRows.forEach(row => globalExpense += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0));
    const totalKasGlobal = (globalBruto * 0.8) - globalExpense;

    // --- HITUNG STATS FILTERED (TERGANTUNG WEEK) ---
    let weekBruto = 0;
    let weekExpense = 0;
    const staffStats: any = {};

    salesRows.forEach(row => {
      if (row[1] === targetWeek) {
        weekBruto += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0);
      }
    });

    expenseRows.forEach(row => {
      if (row[1] === targetWeek) {
        weekExpense += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0);
      }
    });

    // --- HITUNG JAM KERJA UNTUK LEADERBOARD (FILTERED BY WEEK) ---
    absensiRows.forEach(row => {
      const week = row[1];
      const name = row[2];
      const durationStr = row[5] || "0"; // Contoh "2.50 Jam"
      const hours = parseFloat(durationStr.replace(" Jam", "")) || 0;

      if (week === targetWeek) {
        if (!staffStats[name]) staffStats[name] = { name, totalSales: 0, totalHours: 0 };
        staffStats[name].totalHours += hours;
      }
    });

    // Tambahkan data penjualan ke staffStats
    salesRows.forEach(row => {
      if (row[1] === targetWeek) {
        const name = row[2];
        const amount = parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0;
        if (staffStats[name]) staffStats[name].totalSales += amount;
      }
    });

    return NextResponse.json({
      totalKasGlobal,
      finance: {
        bruto: weekBruto,
        expense: weekExpense,
        setoran: weekBruto * 0.2,
        net: (weekBruto * 0.8) - weekExpense
      },
      leaderboard: Object.values(staffStats).sort((a: any, b: any) => b.totalSales - a.totalSales)
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memproses data" }, { status: 500 });
  }
}