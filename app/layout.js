import { Noto_Sans_Ethiopic, Noto_Serif_Ethiopic } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_Ethiopic({
  subsets: ["latin", "ethiopic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Noto_Serif_Ethiopic({
  subsets: ["latin", "ethiopic"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata = {
  title: "አቴንዳንስ",
  description: "የአርብ እና የቅዳሜ የተማሪዎች መገኘት መዝገብ",
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#1b4332",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="am" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}
