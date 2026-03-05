import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      // JURUS BYPASS: Kita set role menjadi 'staff' sementara 
      // agar kamu (Owner) bisa melihat dan mengetes tombol Check In karyawan
      if (session.user) {
        (session.user as any).role = 'management'; 
        (session.user as any).namaRP = session.user.name; // Pakai nama Discord sementara
      }
      return session;
    }
  }
})

export { handler as GET, handler as POST }