"use client";

import Link from "next/link";
import { isISODate } from "../lib/model";
import { useSession } from "./AuthGate";
import InstallApp from "./InstallApp";

export default function Shell({ date, storage = "local", children }) {
  const { user, logout } = useSession();
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
      {user ? (
        <div className="account-row">
          <span>{user.name || user.email}</span>
          {user.role === "admin" ? <Link href="/users">ተጠቃሚዎች</Link> : null}
          <button type="button" onClick={logout}>
            ውጣ
          </button>
        </div>
      ) : null}
      <InstallApp />
      {children}
      <footer className={storage === "error" ? "site-footer error" : "site-footer"}>{message}</footer>
    </>
  );
}
