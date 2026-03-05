import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { google } from "googleapis";

async function getGsheetUser(discordId: string) {
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Users!A2:C', 
    });

    const rows = res.data.values || [];
    // Cari baris yang kolom A (index 0) cocok dengan Discord ID
    const userRow = rows.find(row => row[0] === discordId);
    
    if (userRow) {
      return { namaRP: userRow[1], role: userRow[2] };
    }
    return null;
  } catch (error) {
    console.error("Gsheet Auth Error:", error);
    return null;
  }
}

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Cek ke Gsheet berdasarkan Discord ID (token.sub)
        const gsheetData = await getGsheetUser(token.sub);
        
        if (gsheetData) {
          (session.user as any).namaRP = gsheetData.namaRP;
          (session.user as any).role = gsheetData.role;
        } else {
          // Jika tidak ada di Gsheet, tandai sebagai intruder
          (session.user as any).role = 'unauthorized';
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };