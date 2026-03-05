import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { week, stats, sender } = await req.json();
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL belum disetting di .env" }, { status: 400 });
    }

    // Merakit teks untuk Top Staff (Maksimal 3 orang)
    const topStaff = stats.leaderboard.slice(0, 3).map((s: any, i: number) => {
      const medals = ["🥇", "🥈", "🥉"];
      return `${medals[i]} **${s.name}** - $ ${s.totalSales.toLocaleString('id-ID')} (${s.totalHours.toFixed(2)} Jam)`;
    }).join('\n') || "Belum ada data";

    // Merakit teks untuk Top Items (Maksimal 5 item)
    const topItems = stats.itemSales.slice(0, 5).map((item: any, i: number) => {
      return `▪️ **${item.name}**: ${item.qty} Botol`;
    }).join('\n') || "Belum ada data";

    // Format Embed Discord (Warna Burgundy)
    const embed = {
      title: `📊 Y Luxury Club Recap - ${week}`,
      color: 8388640, // Kode desimal untuk warna Burgundy (#800020)
      fields: [
        {
          name: "💰 Weekly Finance Report",
          value: `> **Gross Profit:** $ ${stats.finance.bruto.toLocaleString('id-ID')}\n> **COGS:** $ ${stats.finance.modal.toLocaleString('id-ID')}\n> **Expense:** $ ${stats.finance.expense.toLocaleString('id-ID')}\n> **Billing Bonus (20%):** $ ${stats.finance.setoran.toLocaleString('id-ID')}\n> **Net Profit:** $ ${stats.finance.net.toLocaleString('id-ID')}`,
          inline: false
        },
        {
          name: "🏆 TOP 3 STAFF",
          value: topStaff,
          inline: true
        },
        {
          name: "🍾 TOP 5 ITEMS",
          value: topItems,
          inline: true
        }
      ],
      footer: {
        text: `Send by: ${sender} | Y Luxury Club System`
      },
      timestamp: new Date().toISOString()
    };

    // Tembak ke Discord
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (response.ok) {
      return NextResponse.json({ message: "Laporan terkirim!" });
    } else {
      throw new Error("Discord menolak webhook");
    }
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengirim webhook" }, { status: 500 });
  }
}