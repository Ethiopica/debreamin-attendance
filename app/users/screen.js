"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../../components/Shell";
import { useSession } from "../../components/AuthGate";
import { useStore } from "../../components/useStore";
import { DEFAULT_GROUPS } from "../../lib/model";

export default function UsersScreen() {
  const { user } = useSession();
  const { state } = useStore();
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const groupNames = Object.fromEntries(
    (state?.groups || DEFAULT_GROUPS).map((group) => [group.id, group.name]),
  );

  async function load() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "ተጠቃሚዎቹ አልተነበቡም።");
    setUsers(data.users || []);
  }

  useEffect(() => {
    if (user?.role !== "admin") return;
    load().catch((error) => setFeedback({ type: "error", text: error.message }));
  }, [user]);

  function toggleGroup(id, list, setList) {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, groups }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "መምህሩ አልተጨመረም።");
      setName("");
      setEmail("");
      setPassword("");
      setGroups([]);
      await load();
      setFeedback({ type: "ok", text: "መምህሩ ተጨምሯል።" });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="back-row">
        <Link href="/">← ወደ ቡድኖች</Link>
      </p>
      <section className="hero">
        <p className="eyebrow">አስተዳዳሪ</p>
        <h1>ተጠቃሚዎች</h1>
        <p>
          አስተዳዳሪው {user?.email} ነው። ለእያንዳንዱ መምህር የሚያየውን ቡድን ብቻ ይምረጡ። የሰጡት የይለፍ ቃል ጊዜያዊ ነው።
          መምህሩ ሲገባ ወደ የራሱ ይቀይረዋል።
        </p>
      </section>

      <form className="user-form" onSubmit={create}>
        <h2>መምህር ጨምር</h2>
        <label className="field">
          <span>ስም</span>
          <input value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>ኢሜይል</span>
          <input
            type="email"
            value={email}
            maxLength={120}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>የይለፍ ቃል</span>
          <input
            type="password"
            value={password}
            minLength={8}
            maxLength={80}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <GroupChecks groups={groups} names={groupNames} onToggle={(id) => toggleGroup(id, groups, setGroups)} />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "እየተቀመጠ ነው…" : "መምህር ጨምር"}
        </button>
      </form>

      <div className="user-list">
        {users.map((item) => (
          <UserRow key={item.id} item={item} names={groupNames} onChanged={load} onFeedback={setFeedback} />
        ))}
      </div>
      {feedback ? <p className={`feedback ${feedback.type}`}>{feedback.text}</p> : null}
    </Shell>
  );
}

function GroupChecks({ groups, names, onToggle }) {
  return (
    <fieldset className="group-checks">
      <legend>ቡድኖች</legend>
      {DEFAULT_GROUPS.map((group) => (
        <label key={group.id}>
          <input type="checkbox" checked={groups.includes(group.id)} onChange={() => onToggle(group.id)} />
          <span>{names[group.id] || group.name}</span>
        </label>
      ))}
    </fieldset>
  );
}

function UserRow({ item, names, onChanged, onFeedback }) {
  const [name, setName] = useState(item.name);
  const [groups, setGroups] = useState(item.groups || []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const admin = item.role === "admin";

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    onFeedback(null);
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, name, password, groups: admin ? item.groups : groups }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "አልተቀመጠም።");
      setPassword("");
      await onChanged();
      onFeedback({ type: "ok", text: "ተቀምጧል።" });
    } catch (error) {
      onFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`«${item.name}» ይውጣ?`)) return;
    setBusy(true);
    onFeedback(null);
    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "አልተወገደም።");
      await onChanged();
    } catch (error) {
      onFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="user-row" onSubmit={save}>
      <p className="eyebrow">{admin ? "አስተዳዳሪ" : "መምህር"}</p>
      <p>{item.email}</p>
      <label className="field">
        <span>ስም</span>
        <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
      </label>
      {admin ? (
        <p>ሁሉንም ቡድኖች ያያል።</p>
      ) : (
        <GroupChecks
          groups={groups}
          names={names}
          onToggle={(id) => setGroups(groups.includes(id) ? groups.filter((value) => value !== id) : [...groups, id])}
        />
      )}
      <label className="field">
        <span>አዲስ የይለፍ ቃል</span>
        <input
          type="password"
          value={password}
          maxLength={80}
          placeholder="ባዶ ከሆነ አይቀየርም"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>
          አስቀምጥ
        </button>
        {admin ? null : (
          <button type="button" className="ghost" disabled={busy} onClick={remove}>
            አስወግድ
          </button>
        )}
      </div>
    </form>
  );
}
