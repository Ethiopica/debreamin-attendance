"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "../../components/Shell";
import { useSession } from "../../components/AuthGate";

const ADMIN_EMAIL = "eliobais@gmail.com";

export default function LoginScreen() {
  const router = useRouter();
  const { needsSetup, refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const settingUp = needsSetup && email.trim().toLowerCase() === ADMIN_EMAIL;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          setup: settingUp,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "መግባት አልተሳካም።");
      await refresh();
      router.replace("/");
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <section className="hero">
        <p className="eyebrow">መግቢያ</p>
        <h1>ይግቡ</h1>
        <p>
          {needsSetup
            ? "የራስዎን ኢሜይል ይጻፉ። አስተዳዳሪ ከሆኑ eliobais@gmail.com ይጻፉና የመጀመሪያውን የይለፍ ቃል ያስቀምጡ።"
            : "በኢሜይልና በየይለፍ ቃል ይግቡ። መምህር የተፈቀደለትን ቡድን ብቻ ያያል።"}
        </p>
      </section>
      <form className="login-form" onSubmit={submit}>
        <label className="field">
          <span>ኢሜይል</span>
          <input
            name="email"
            type="email"
            inputMode="email"
            value={email}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={120}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>የይለፍ ቃል</span>
          <input
            name="password"
            type="password"
            value={password}
            autoComplete="current-password"
            minLength={8}
            maxLength={80}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="feedback error">{error}</p> : null}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "እየተጠበቀ ነው…" : settingUp ? "የይለፍ ቃል አስቀምጥ" : "ግባ"}
        </button>
      </form>
    </Shell>
  );
}
