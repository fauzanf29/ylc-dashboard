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

    const [salesRes, expenseRes, absensiRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Penjualan!A2:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Pengeluaran!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Absensi!A2:F' })
    ]);

    const salesRows = salesRes.data.values || [];
    const expenseRows = expenseRes.data.values || [];
    const absensiRows = absensiRes.data.values || [];

    // --- HITUNG TOTAL KAS GLOBAL ---
    let globalBruto = 0;
    salesRows.forEach(row => globalBruto += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0));
    let globalExpense = 0;
    expenseRows.forEach(row => globalExpense += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0));
    const totalKasGlobal = (globalBruto * 0.8) - globalExpense;

    // --- STATE UNTUK FILTER MINGGUAN ---
    let weekBruto = 0;
    let weekModal = 0;
    let weekExpense = 0;
    const staffStats: any = {};
    const itemSalesStats: any = {};
    const expensesList: any[] = [];

    // --- PROSES ABSENSI ---
    absensiRows.forEach(row => {
      const week = row[1];
      const name = row[2];
      const durationStr = row[5] || "0"; 
      const hours = parseFloat(durationStr.replace(" Jam", "")) || 0;

      if (week === targetWeek) {
        if (!staffStats[name]) staffStats[name] = { name, totalSales: 0, totalHours: 0 };
        staffStats[name].totalHours += hours;
      }
    });

    // --- PROSES PENJUALAN & ITEM TERLARIS ---
    salesRows.forEach(row => {
      if (row[1] === targetWeek) {
        const name = row[2];
        const item = row[3];
        const qty = parseInt(row[4]) || 0;
        const amount = parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0;
        const modal = parseInt(row[6]?.toString().replace(/[^0-9]/g, "")) || 0; // Baca Kolom G

        weekBruto += amount;
        weekModal += modal;

        if (staffStats[name]) staffStats[name].totalSales += amount;

        if (!itemSalesStats[item]) itemSalesStats[item] = { name: item, qty: 0, total: 0 };
        itemSalesStats[item].qty += qty;
        itemSalesStats[item].total += amount;
      }
    });

    // --- PROSES PENGELUARAN ---
    expenseRows.forEach(row => {
      if (row[1] === targetWeek) {
        const date = row[0];
        const pic = row[2];
        const kategori = row[3];
        const keterangan = row[4];
        const amount = parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0;

        weekExpense += amount;
        expensesList.push({ date, pic, kategori, keterangan, amount });
      }
    });

    const setoran20 = weekBruto * 0.2; 
    const netProfit = (weekBruto * 0.8) - weekExpense;

    return NextResponse.json({
      totalKasGlobal,
      finance: {
        bruto: weekBruto,
        modal: weekModal,
        expense: weekExpense,
        setoran: setoran20,
        net: netProfit
      },
      leaderboard: Object.values(staffStats).sort((a: any, b: any) => b.totalSales - a.totalSales),
      itemSales: Object.values(itemSalesStats).sort((a: any, b: any) => b.qty - a.qty),
      expensesList: expensesList.reverse() // Dibalik agar yang terbaru di atas
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal memproses data" }, { status: 500 });
  }
}