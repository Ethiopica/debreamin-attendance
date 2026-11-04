"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const SessionContext = createContext(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json();
      setUser(data.user || null);
      setNeedsSetup(Boolean(data.needsSetup));
      setReady(true);
      return data.user || null;
    } catch {
      setUser(null);
      setReady(true);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ready) return;
    if (!user && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace(user.mustChangePassword ? "/password" : "/");
    if (user?.mustChangePassword && pathname !== "/password" && pathname !== "/login") {
      router.replace("/password");
    }
    if (user && !user.mustChangePassword && pathname === "/users" && user.role !== "admin") router.replace("/");
  }, [ready, user, pathname, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }

  if (!ready || (!user && pathname !== "/login") || (user && pathname === "/login")) {
    return <p className="loading">እየተጫነ ነው…</p>;
  }
  if (user?.mustChangePassword && pathname !== "/password") {
    return <p className="loading">እየተጫነ ነው…</p>;
  }
  if (pathname === "/users" && user?.role !== "admin") {
    return <p className="loading">እየተጫነ ነው…</p>;
  }

  return (
    <SessionContext.Provider value={{ user, needsSetup, ready, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
