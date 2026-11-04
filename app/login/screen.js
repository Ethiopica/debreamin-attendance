"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "../../components/Shell";
import { useSession } from "../../components/AuthGate";

export default function LoginScreen() {
  const router = useRouter();
  const { needsSetup, refresh } = useSession();
  const [email, setEmail] = useState(needsSetup ? "eliobais@gmail.com" : "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: needsSetup ? "eliobais@gmail.com" : email,
          password,
          setup: needsSetup,
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
        <p className="eyebrow">{needsSetup ? "የመጀመሪያ ማዘጋጃ" : "መግቢያ"}</p>
        <h1>{needsSetup ? "የአስተዳዳሪ የይለፍ ቃል" : "ይግቡ"}</h1>
        <p>
          {needsSetup
            ? "አስተዳዳሪው eliobais@gmail.com ነው። የይለፍ ቃል ይፍጠሩ፣ ከዚያ ለእያንዳንዱ ቡድን መምህር መዳረሻ ይስጡ።"
            : "በኢሜይልና በየይለፍ ቃል ይግቡ። መምህር የተፈቀደለትን ቡድን ብቻ ያያል።"}
        </p>
      </section>
      <form className="login-form" onSubmit={submit}>
        <label className="field">
          <span>ኢሜይል</span>
          <input
            type="email"
            value={needsSetup ? "eliobais@gmail.com" : email}
            readOnly={needsSetup}
            autoComplete="username"
            maxLength={120}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{needsSetup ? "አዲስ የይለፍ ቃል" : "የይለፍ ቃል"}</span>
          <input
            type="password"
            value={password}
            autoComplete={needsSetup ? "new-password" : "current-password"}
            minLength={8}
            maxLength={80}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="feedback error">{error}</p> : null}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "እየተጠበቀ ነው…" : needsSetup ? "የይለፍ ቃል አስቀምጥ" : "ግባ"}
        </button>
      </form>
    </Shell>
  );
}
