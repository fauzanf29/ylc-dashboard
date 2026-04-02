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
    // 1. JWT Callback: HANYA JALAN SEKALI SAAT LOGIN PERTAMA KALI
    async jwt({ token, account, profile }) {
      // Jika account ada, berarti user baru saja login
      if (account && token.sub) {
        const gsheetData = await getGsheetUser(token.sub);
        if (gsheetData) {
          token.namaRP = gsheetData.namaRP;
          token.role = gsheetData.role;
        } else {
          token.role = 'unauthorized';
        }
      }
      return token;
    },
    // 2. SESSION Callback: Cuma baca dari KTP (token), TIDAK NEMBAK GSHEET LAGI
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).namaRP = token.namaRP;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt", // Wajib pakai JWT agar tokennya tersimpan
  }
});

export { handler as GET, handler as POST };