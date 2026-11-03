export default function manifest() {
  return {
    id: "/",
    name: "አቴንዳንስ",
    short_name: "አቴንዳንስ",
    description: "የአርብ እና የቅዳሜ የተማሪዎች መገኘት መዝገብ",
    lang: "am",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#efe4d2",
    theme_color: "#1b4332",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
