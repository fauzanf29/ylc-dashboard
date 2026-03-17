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
    const { userName, keterangan, jumlah, minggu } = body;
    
    if (!jumlah || jumlah <= 0) return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });

    const sheets = await initSheets();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Catat ke Tab Khusus Dividen (Terpisah dari Operasional)
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Log_Dividen!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[timeStr, minggu, userName, keterangan, jumlah]] },
    });

    // 🔴 NOTIF DISCORD WARNA EMAS (OPSIONAL JIKA MAU DIPASANG)
    const webhookUrl = process.env.DISCORD_WEBHOOK_REIMBURSE; 
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: "💰 PENARIKAN DIVIDEN (PROFIT SHARING)",
            description: `**${userName}** telah menarik dividen dari brankas.\n\n**Jumlah:** $ ${jumlah.toLocaleString('id-ID')}\n**Keterangan:** ${keterangan}`,
            color: 15844367, // Warna Emas
            timestamp: new Date().toISOString()
          }]
        })
      }).catch(err => console.error("Webhook gagal:", err));
    }

    return NextResponse.json({ message: "Dividen berhasil ditarik!" });
  } catch (error: any) {
    console.error("DIVIDEN_ERROR:", error);
    return NextResponse.json({ error: "Gagal menarik dividen" }, { status: 500 });
  }
}