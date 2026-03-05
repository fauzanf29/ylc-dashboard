import AuthProvider from "./components/AuthProvider";
import "./globals.css"; // Tetap panggil untuk background hitam dasar

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* JURUS BYPASS: Panggil Tailwind langsung dari server pusat */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    darkBg: '#0a0a0a',
                    cardBg: '#141414',
                    burgundy: '#800020',
                    burgundyLight: '#a8002a'
                  }
                }
              }
            }
          `
        }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}