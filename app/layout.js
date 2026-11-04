import localFont from "next/font/local";
import AuthGate from "../components/AuthGate";
import "./globals.css";

const sans = localFont({
  src: [
    { path: "../public/fonts/NotoSansEthiopic-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/NotoSansEthiopic-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata = {
  title: "አቴንዳንስ",
  description: "የአርብ እና የቅዳሜ የተማሪዎች መገኘት መዝገብ",
  applicationName: "አቴንዳንስ",
  appleWebApp: {
    capable: true,
    title: "አቴንዳንስ",
    statusBarStyle: "default",
  },
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#1b4332",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="am" className={sans.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <div className="app">
          <AuthGate>{children}</AuthGate>
        </div>
      </body>
    </html>
  );
}
