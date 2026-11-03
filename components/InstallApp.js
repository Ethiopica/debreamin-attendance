"use client";

import { useEffect, useState } from "react";

const HIDE_KEY = "attendance-install-hide";

export default function InstallApp() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (!standalone && window.localStorage.getItem(HIDE_KEY) !== "1") setHidden(false);
    setReady(true);

    function onPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
      setHidden(false);
    }
    function onInstalled() {
      setHidden(true);
      setPromptEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!ready || hidden) return null;

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setHidden(true);
  }

  function dismiss() {
    window.localStorage.setItem(HIDE_KEY, "1");
    setHidden(true);
  }

  return (
    <section className="install-card">
      <h2>በስልክ ይጫኑ</h2>
      <p>መተግበሪያው በስልኩ መነሻ ገጽ ላይ ይቀመጣል። የተማሪዎች ስም በዚያው ስልክ ይቀራሉ፤ በየሳምንቱ ምልክቱን ብቻ ይሙሉ።</p>
      <ol>
        <li>አንድሮይድ፦ Chrome ይክፈቱና «መተግበሪያ ጫን» ወይም ከታች ያለውን ቁልፍ ይጫኑ።</li>
        <li>አይፎን፦ Safari ውስጥ ማጋራትን ይንኩ፣ ከዚያ «Add to Home Screen» ይምረጡ።</li>
      </ol>
      <div className="actions">
        {promptEvent ? (
          <button type="button" className="primary" onClick={install}>
            መተግበሪያውን ጫን
          </button>
        ) : null}
        <button type="button" className="ghost" onClick={dismiss}>
          ደብቅ
        </button>
      </div>
    </section>
  );
}
