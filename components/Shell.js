"use client";

import Link from "next/link";
import { isISODate } from "../lib/model";

export default function Shell({ date, storage = "local", children }) {
  const href = isISODate(date) ? `/?date=${date}` : "/";
  const message =
    storage === "cloud"
      ? "መዝገቡ በደመና ላይ ይቀመጣል።"
      : storage === "error"
        ? "መዝገቡ ወደ ደመናው አልተላከም። ግንኙነቱን ያረጋግጡ።"
        : "የተማሪዎች ስምና የመገኘት መዝገብ በዚህ መሳሪያ ላይ ይቀመጣሉ።";
  return (
    <>
      <header className="topbar">
        <Link href={href} className="brand">
          አቴንዳንስ
        </Link>
        <p className="tagline">የመገኘት መዝገብ</p>
      </header>
      {children}
      <footer className={storage === "error" ? "site-footer error" : "site-footer"}>{message}</footer>
    </>
  );
}
