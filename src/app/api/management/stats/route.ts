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

    // AMBIL SEMUA TAB YANG DIBUTUHKAN (+ Tambahan Log_Bonus & Log_Dividen)
    const [salesRes, expenseRes, absensiRes, invLogRes, bonusRes, dividenRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Penjualan!A2:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Pengeluaran!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Absensi!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Inventory!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Bonus!A2:E' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Log_Dividen!A2:E' }).catch(() => ({ data: { values: [] } }))
    ]);

    const salesRows = salesRes.data?.values || [];
    const expenseRows = expenseRes.data?.values || [];
    const absensiRows = absensiRes.data?.values || [];
    const invLogRows = invLogRes.data?.values || [];
    const bonusRows = bonusRes.data?.values || [];
    const dividenRows = dividenRes.data?.values || [];

    // --- 1. HITUNG KAS GLOBAL ---
    let globalBruto = 0, globalExpense = 0, globalBonus = 0, globalDividen = 0;
    
    salesRows.forEach(row => globalBruto += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0));
    expenseRows.forEach(row => globalExpense += (parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0));
    bonusRows.forEach(row => globalBonus += (parseInt(row[4]?.toString().replace(/[^0-9]/g, "")) || 0));
    dividenRows.forEach(row => globalDividen += (parseInt(row[4]?.toString().replace(/[^0-9]/g, "")) || 0));
    
    // Total Kas sekarang dikurangi juga sama uang Bonus & Dividen yang udah ditarik
    const totalKasGlobal = (globalBruto * 0.8) - globalExpense - globalBonus - globalDividen;

    // --- 2. INITIALIZE DATA MINGGUAN ---
    let weekBruto = 0;
    let weekModal = 0;
    let weekExpense = 0;
    let weekBonus = 0;
    let weekDividen = 0;
    const staffStats: any = {};
    const itemSalesStats: any = {};
    const expensesList: any[] = [];

    // --- 3. PROSES ABSENSI (JAM KERJA) ---
    absensiRows.forEach(row => {
      if (row[1] === targetWeek) {
        const name = row[2];
        const hours = parseFloat((row[5] || "0").replace(" Jam", "")) || 0;
        if (!staffStats[name]) staffStats[name] = { name, totalSales: 0, totalHours: 0, historyAmbil: [], historyTaruh: [], historySales: [] };
        staffStats[name].totalHours += hours;
      }
    });

    // --- 4. PROSES PENJUALAN ---
    salesRows.forEach(row => {
      if (row[1] === targetWeek) {
        const time = row[0];
        const name = row[2];
        const item = row[3];
        const qty = parseInt(row[4]) || 0;
        const amount = parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0;
        const modal = parseInt(row[6]?.toString().replace(/[^0-9]/g, "")) || 0;

        weekBruto += amount;
        weekModal += modal;

        if (!staffStats[name]) staffStats[name] = { name, totalSales: 0, totalHours: 0, historyAmbil: [], historyTaruh: [], historySales: [] };
        staffStats[name].totalSales += amount;
        
        // Simpan Log Penjualan Staf
        staffStats[name].historySales.push({ time, item, qty, amount });

        if (!itemSalesStats[item]) itemSalesStats[item] = { name: item, qty: 0, total: 0 };
        itemSalesStats[item].qty += qty;
        itemSalesStats[item].total += amount;
      }
    });

    // --- 4.5 PROSES LOG INVENTORY (AMBIL/TARUH) ---
    invLogRows.forEach(row => {
      try {
        const timeStrRaw = row[0] || "";
        const dateMatch = timeStrRaw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        
        let rowWeek = "";
        
        if (dateMatch) {
          const day = dateMatch[1];
          const month = dateMatch[2];
          const year = dateMatch[3];
          
          const actionTime = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+07:00`);
          // Note: Patokan epoch Inventory di sini pakai 24 Jan. Jika ingin disamakan dengan operasional club (23 Jan), bisa diubah di sini nanti.
          const epoch = new Date('2026-01-24T00:00:00+07:00').getTime();
          const diffInDays = Math.floor((actionTime.getTime() - epoch) / (1000 * 60 * 60 * 24));
          rowWeek = `Minggu ${Math.floor(diffInDays / 7) + 1}`;
        }

        if (rowWeek === targetWeek) {
          const time = row[0];
          const name = row[1];
          const item = row[2];
          const action = row[3]?.toUpperCase(); 
          const qty = parseInt(row[4]) || 0;

          if (!staffStats[name]) staffStats[name] = { name, totalSales: 0, totalHours: 0, historyAmbil: [], historyTaruh: [], historySales: [] };

          if (action === 'AMBIL') {
            staffStats[name].historyAmbil.push({ time, item, qty });
          } else if (action === 'TARUH') {
            staffStats[name].historyTaruh.push({ time, item, qty });
          }
        }
      } catch (e) {
      }
    });

    // --- 5. PROSES PENGELUARAN ---
    expenseRows.forEach(row => {
      if (row[1] === targetWeek) {
        const amount = parseInt(row[5]?.toString().replace(/[^0-9]/g, "")) || 0;
        weekExpense += amount;
        expensesList.push({ date: row[0], week: row[1], pic: row[2], kategori: row[3], keterangan: row[4], amount });
      }
    });

    // --- 6. PROSES BONUS & DIVIDEN ---
    bonusRows.forEach(row => {
      if (row[1] === targetWeek) weekBonus += (parseInt(row[4]?.toString().replace(/[^0-9]/g, "")) || 0);
    });
    
    dividenRows.forEach(row => {
      if (row[1] === targetWeek) weekDividen += (parseInt(row[4]?.toString().replace(/[^0-9]/g, "")) || 0);
    });

    // HITUNGAN FINAL
    const setoran20 = weekBruto * 0.2; 
    const netProfit = (weekBruto * 0.8) - weekExpense - weekBonus - weekDividen;

    return NextResponse.json({
      totalSalesGlobal: weekBruto,
      totalExpenseGlobal: weekExpense,
      totalKasGlobal: totalKasGlobal,
      finance: { 
        bruto: weekBruto, 
        modal: weekModal, 
        expense: weekExpense, 
        bonus: weekBonus,     // <--- Datanya dikirim ke frontend & webhook
        dividen: weekDividen, // <--- Datanya dikirim ke frontend & webhook
        setoran: setoran20, 
        net: netProfit 
      },
      leaderboard: Object.values(staffStats).sort((a: any, b: any) => b.totalSales - a.totalSales),
      itemSales: Object.values(itemSalesStats).sort((a: any, b: any) => b.qty - a.qty),
      expensesList: expensesList.reverse()
    });
    
  } catch (error) {
    console.error("STATS_ERROR:", error);
    return NextResponse.json({ error: "Gagal memproses data" }, { status: 500 });
  }
}