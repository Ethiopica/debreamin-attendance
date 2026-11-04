"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Shell from "../../components/Shell";
import { useSession } from "../../components/AuthGate";

export default function PasswordScreen() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const required = Boolean(user?.mustChangePassword);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, nextPassword, confirmPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "የይለፍ ቃሉ አልተቀየረም።");
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
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
        <p className="eyebrow">{required ? "የመጀመሪያ መግቢያ" : "መለያ"}</p>
        <h1>የይለፍ ቃል ቀይር</h1>
        <p>
          {required
            ? "አስተዳዳሪው የሰጠዎትን የይለፍ ቃል ያስገቡ፣ ከዚያ የራስዎን ይምረጡ። ከዚህ በኋላ ቡድንዎ ይከፈታል።"
            : "የአሁኑን የይለፍ ቃል ያረጋግጡ፣ ከዚያ አዲስ ይምረጡ።"}
        </p>
      </section>
      <form className="login-form" onSubmit={submit}>
        <label className="field">
          <span>የአሁኑ የይለፍ ቃል</span>
          <input
            type="password"
            value={currentPassword}
            autoComplete="current-password"
            maxLength={80}
            required
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="field">
          <span>አዲስ የይለፍ ቃል</span>
          <input
            type="password"
            value={nextPassword}
            autoComplete="new-password"
            minLength={8}
            maxLength={80}
            required
            onChange={(event) => setNextPassword(event.target.value)}
          />
        </label>
        <label className="field">
          <span>አዲሱን ይድገሙ</span>
          <input
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            minLength={8}
            maxLength={80}
            required
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        {error ? <p className="feedback error">{error}</p> : null}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "እየተቀየረ ነው…" : "የይለፍ ቃል ቀይር"}
        </button>
      </form>
    </Shell>
  );
}
