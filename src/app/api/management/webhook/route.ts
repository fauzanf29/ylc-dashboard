import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Menangkap data inventory dari page.tsx
    const { week, stats, sender, inventory = [] } = await req.json();
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL; 

    if (!webhookUrl) return NextResponse.json({ error: "Webhook URL missing" }, { status: 500 });

    const f = stats.finance || { bruto: 0, setoran: 0, expense: 0, bonus: 0, dividen: 0, net: 0, modal: 0 };
    
    // --- 🏆 OLAH DATA TOP 5 BARANG ---
    const topItemsStr = stats.itemSales && stats.itemSales.length > 0 
      ? stats.itemSales.slice(0, 5).map((item: any, i: number) => `**${i + 1}.** ${item.name} \`(${item.qty}x)\``).join('\n') 
      : "Belum ada penjualan";

    // --- 🥇 OLAH DATA TOP 3 STAFF ---
    const topStaffStr = stats.leaderboard && stats.leaderboard.length > 0
      ? stats.leaderboard.slice(0, 3).map((staff: any, i: number) => `**${i + 1}.** ${staff.name} \`$${staff.totalSales.toLocaleString('id-ID')}\``).join('\n')
      : "Belum ada data";

    // --- 📦 OLAH DATA SISA GUDANG ---
    // --- 📦 OLAH DATA SISA GUDANG (ANTI UNDEFINED) ---
    const sisaGudangStr = inventory && inventory.length > 0
      ? inventory.map((inv: any) => {
          // Jurus sapu jagat: cari nama variabel yang cocok
          const itemName = inv.name || inv.item || inv.Item || inv.barang || "Barang";
          const itemQty = inv.qty !== undefined ? inv.qty : (inv.stock || inv.Stock || inv.stok || inv.jumlah || 0);
          
          return `▪️ ${itemName}: **${itemQty}**`;
        }).join('\n')
      : "Data gudang kosong";

    // Desain Struk Discord Super Mewah
    const embed = {
      title: `📊 LAPORAN KEUANGAN YLC - ${week.toUpperCase()}`,
      description: `Rekapitulasi mingguan telah diverifikasi oleh Management (**${sender}**).`,
      color: 15844367, // Warna Emas VIP
      fields: [
        // --- BARIS 1: UANG MASUK & MODAL ---
        { name: "💰 Pendapatan Bruto", value: `\`$ ${f.bruto.toLocaleString('id-ID')}\``, inline: true },
        { name: "🏦 Potongan Bonus Billing (20%)", value: `\`$ ${f.setoran.toLocaleString('id-ID')}\``, inline: true },
        { name: "📦 Beban Modal (COGS)", value: `\`$ ${f.modal.toLocaleString('id-ID')}\``, inline: true },
        
        // --- BARIS 2: UANG KELUAR ---
        { name: "💸 Operasional", value: `\`$ ${f.expense.toLocaleString('id-ID')}\``, inline: true },
        { name: "🥈 Bonus Karyawan", value: `\`$ ${f.bonus.toLocaleString('id-ID')}\``, inline: true },
        { name: "👑 Dividen Ditarik", value: `\`$ ${f.dividen.toLocaleString('id-ID')}\``, inline: true },

        // --- BARIS 3: PROFIT BERSIH ---
        { name: "📈 NET PROFIT", value: `**\`$ ${f.net.toLocaleString('id-ID')}\`**`, inline: false },

        // --- PEMISAH ---
        { name: "\u200b", value: "━━━━━━━━━━━━━━━━━━━━━━", inline: false },

        // --- BARIS 4: STATISTIK ---
        { name: "🏆 Top 5 Barang Laku", value: topItemsStr, inline: true },
        { name: "🥇 Top 3 Staff Sales", value: topStaffStr, inline: true },
        { name: "🏢 Sisa Stok Gudang", value: sisaGudangStr, inline: true },
      ],
      footer: { text: "Y Luxury Club Management System • Paleto Bay" },
      timestamp: new Date().toISOString()
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}