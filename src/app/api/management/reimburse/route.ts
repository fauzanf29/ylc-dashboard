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

// MESIN PENGIRIM DISCORD WEBHOOK (VERSI CCTV)
const sendDiscordLog = async (title: string, description: string, color: number) => {
  // Panggil dari .env, ATAU langsung pakai link aslinya (fallback)
  const webhookUrl = process.env.DISCORD_WEBHOOK_REIMBURSE || "https://discordapp.com/api/webhooks/1481264846375878931/3QJ8oQ6QnxHyJWU64PKALEg_LqvJGV_GIGlf7FG9_N_x7WVMU59uFzAEgEWOZedTT6Nq";
  
  // Penjaganya cukup ngecek: "Apakah kosong?" Gausah ngecek isi link aslinya lagi!
  if (!webhookUrl) {
    console.error("❌ LINK WEBHOOK KOSONG BOS!");
    return;
  }

  try {
    console.log("Mencoba mengirim surat ke Discord...");
    
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📢 **YLC Management System** | Update Reimburse!`,
        embeds: [{
          title: title,
          description: description,
          color: color,
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error("❌ DISCORD NOLAK BOS! Status:", res.status);
      console.error("Alasannya:", errData);
    } else {
      console.log("✅ SUKSES MENDARAT DI DISCORD!");
    }
    
  } catch (error) { 
    console.error("❌ MESIN WEBHOOK JEBOL:", error); 
  }
};

// MESIN 1: Menampilkan daftar yang PENDING ke layar Management
export async function GET(req: Request) {
  try {
    const sheets = await initSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Log_Reimburse!A:F', 
    });
    
    const rows = response.data.values || [];
    
    const pendingRequests = rows.map((row, index) => ({
      rowNumber: index + 1, 
      waktu: row[0],
      minggu: row[1],
      nama: row[2],
      keterangan: row[3],
      jumlah: parseInt(row[4] || '0'),
      status: row[5]
    })).filter(r => r.status === 'PENDING');

    return NextResponse.json(pendingRequests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memuat data reimburse" }, { status: 500 });
  }
}

// MESIN 2: Menerima Request & Mengeksekusi ACC/Tolak + Kirim Discord
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userName, keterangan, jumlah, rowNumber, waktu, minggu } = body;
    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // JIKA STAFF MINTA REIMBURSE
    if (action === 'request') {
      const epoch = new Date('2026-01-24T00:00:00+07:00').getTime();
      const now = new Date();
      const timeStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const diffInDays = Math.floor((now.getTime() - epoch) / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(diffInDays / 7) + 1;
      const weekNumber = `Minggu ${weekNum > 0 ? weekNum : 1}`;

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Log_Reimburse!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[timeStr, weekNumber, userName, keterangan, jumlah, 'PENDING']] },
      });

      // Notif Discord Biru (Request Masuk)
      await sendDiscordLog(
        "🧾 PENGAJUAN REIMBURSE BARU", 
        `**${userName}** mengajukan reimburse sebesar **$ ${jumlah.toLocaleString('id-ID')}**\n**Keterangan:** ${keterangan}\n\n*Menunggu ACC dari Management.*`, 
        3447003
      );

      return NextResponse.json({ message: "Pengajuan Reimburse sukses terkirim ke Management!" });
    } 
    
    // JIKA MANAGEMENT KETOK PALU (ACC / TOLAK)
    else if (action === 'acc' || action === 'tolak') {
      const newStatus = action === 'acc' ? 'ACC' : 'TOLAK';

      // 1. Ubah status PENDING
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Log_Reimburse!F${rowNumber}`, 
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newStatus]] },
      });

      // 2. Kalau di-ACC, otomatis catat ke brankas Log_Pengeluaran
      if (action === 'acc') {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Log_Pengeluaran!A:F',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[waktu, minggu, userName, 'Reimburse', `[Reimburse ACC] ${keterangan}`, jumlah]] },
        });

        // Notif Discord Hijau (ACC)
        await sendDiscordLog(
          "✅ REIMBURSE DI-ACC", 
          `Pengajuan dari **${userName}** sebesar **$ ${jumlah.toLocaleString('id-ID')}** telah disetujui.\n**Keterangan:** ${keterangan}`, 
          3066993
        );
      } else {
        // Notif Discord Merah (Tolak)
        await sendDiscordLog(
          "❌ REIMBURSE DITOLAK", 
          `Pengajuan dari **${userName}** sebesar **$ ${jumlah.toLocaleString('id-ID')}** ditolak oleh Management.\n**Keterangan:** ${keterangan}`, 
          15158332
        );
      }

      return NextResponse.json({ message: `Reimburse berhasil di-${newStatus}` });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal proses request reimburse" }, { status: 500 });
  }
}