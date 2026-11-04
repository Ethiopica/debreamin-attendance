"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Shell from "../../../../components/Shell";
import { useStore } from "../../../../components/useStore";
import {
  buildGroupSummary,
  classDay,
  formatAmharicDate,
  formatMonth,
  isISODate,
  parseISO,
  renameStudent,
  setMark,
  studiedDates,
  toISO,
} from "../../../../lib/model";
import { downloadSummary } from "../../../../lib/send-report";

const STATUS_NAME = {
  present: "ተገኝተዋል",
  absent: "ቀርተዋል",
  permission: "ፈቃድ ጠይቀዋል",
};

const STATUS_KEYS = ["present", "absent", "permission"];
const WEEKDAY_LABELS = ["እሑ", "ሰኞ", "ማክ", "ረቡ", "ሐሙ", "አር", "ቅዳ"];
const PICK_KEY = "attendance-summary-pick-v1";

function loadPicks(groupId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PICK_KEY) || "{}");
    const list = saved?.[groupId];
    return Array.isArray(list) ? list.filter(isISODate) : [];
  } catch {
    return [];
  }
}

function savePicks(groupId, isos) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PICK_KEY) || "{}");
    saved[groupId] = isos;
    window.localStorage.setItem(PICK_KEY, JSON.stringify(saved));
  } catch {
    // The attendance record itself is stored separately.
  }
}

export default function SummaryScreen() {
  const params = useParams();
  const id = params.id;
  const { state, update, ready, storage } = useStore();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const [picked, setPicked] = useState([]);
  const [monthIso, setMonthIso] = useState("");

  useEffect(() => {
    if (!id) return;
    setPicked(loadPicks(id));
  }, [id]);

  useEffect(() => {
    if (!ready || !state || !id || monthIso) return;
    const recorded = studiedDates(state, id);
    const start = recorded.at(-1) || (isISODate(state.lastDate) ? state.lastDate : toISO(new Date()));
    const date = parseISO(start);
    setMonthIso(toISO(new Date(date.getFullYear(), date.getMonth(), 1)));
  }, [ready, state, id, monthIso]);

  if (!ready) {
    return (
      <Shell storage={storage}>
        <p className="loading">እየተጫነ ነው…</p>
      </Shell>
    );
  }

  const group = state.groups.find((item) => item.id === id);
  if (!group) {
    return (
      <Shell storage={storage}>
        <section className="notice">
          <h1>ይህ ቡድን አልተገኘም</h1>
          <Link className="primary link-button" href="/">
            ተመለስ
          </Link>
        </section>
      </Shell>
    );
  }

  const recorded = studiedDates(state, group.id);
  const chosen = picked.filter((iso) => isISODate(iso) && classDay(iso) === group.day);
  const view = buildGroupSummary(state, group.id, chosen);
  const back = isISODate(state.lastDate) ? `/group/${group.id}?date=${state.lastDate}` : `/group/${group.id}`;
  const dayWord = group.day === "friday" ? "አርብ" : "ቅዳሜ";

  function choose(next) {
    const kept = [...new Set(next.filter((iso) => isISODate(iso) && classDay(iso) === group.day))].sort();
    setPicked(kept);
    savePicks(group.id, kept);
  }

  function toggleDate(iso) {
    choose(chosen.includes(iso) ? chosen.filter((item) => item !== iso) : [...chosen, iso]);
  }

  async function download() {
    setBusy(true);
    setFeedback(null);
    try {
      const message = await downloadSummary(view);
      setFeedback({ type: "ok", text: message });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell storage={storage}>
      <p className="back-row">
        <Link href={back}>← ወደ መዝገብ</Link>
      </p>
      <section className="hero">
        <p className="eyebrow">ማጠቃለያ</p>
        <h1>{group.name}</h1>
        <p>በቀን መቁጠሪያው ላይ {dayWord} ይጫኑ። የተመረጠው ቀን ብቻ በማጠቃለያው ይገባል። ነጥብ ያለው ቀን መዝገብ አለው።</p>
      </section>

      {monthIso ? (
        <DateCalendar
          monthIso={monthIso}
          weekday={group.day === "friday" ? 5 : 6}
          recorded={recorded}
          chosen={chosen}
          onToggle={toggleDate}
          onMonth={(delta) => {
            const date = parseISO(monthIso);
            date.setMonth(date.getMonth() + delta);
            setMonthIso(toISO(new Date(date.getFullYear(), date.getMonth(), 1)));
          }}
          onRecorded={() => choose(recorded)}
          onClear={() => choose([])}
        />
      ) : null}

      <ul className="legend">
        <li>
          <span className="swatch mark-present" /> ተገኝተዋል
        </li>
        <li>
          <span className="swatch mark-absent" /> ቀርተዋል
        </li>
        <li>
          <span className="swatch mark-permission" /> ፈቃድ ጠይቀዋል
        </li>
      </ul>

      {view.students.length === 0 ? (
        <section className="notice compact">
          <h2>እስካሁን ተማሪ የለም</h2>
          <p>ስሞቹን በቡድኑ መዝገብ ላይ ይጨምሩ። ከዚያ በኋላ ማጠቃለያው እዚህ ይታያል።</p>
        </section>
      ) : (
        <div className="summary-scroll">
          <table className="summary-table">
            <thead>
              <tr>
                <th className="name-col">ስም</th>
                <th className="count-col present-ink">ተ</th>
                <th className="count-col absent-ink">ቀ</th>
                <th className="count-col permission-ink">ፈ</th>
                {view.dates.map((date, index) => (
                  <th key={date.iso} className="date-head">
                    <span>{date.day}</span>
                    <small>{date.month}</small>
                    {index === 0 || date.year !== view.dates[index - 1].year ? <small>{date.year}</small> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.students.map((student) => (
                <tr key={student.id}>
                  <th className="name-col" scope="row">
                    <NameCell
                      name={student.name}
                      onRename={(name) => update((current) => renameStudent(current, student.id, name))}
                    />
                  </th>
                  <td className="count-col present-ink">{student.present}</td>
                  <td className="count-col absent-ink">{student.absent}</td>
                  <td className="count-col permission-ink">{student.permission}</td>
                  {student.marks.map((status, index) => {
                    const date = view.dates[index];
                    const active = selected?.studentId === student.id && selected?.iso === date.iso;
                    return (
                      <td key={date.iso} className={status ? `mark-cell mark-${status}` : "mark-cell"}>
                        <button
                          type="button"
                          className={active ? "mark-button is-selected" : "mark-button"}
                          aria-pressed={active}
                          aria-label={`${student.name}፣ ${date.day} ${date.month} ${date.year}፣ ${STATUS_NAME[status] || "አልተመዘገበም"}`}
                          onClick={() => setSelected({ studentId: student.id, iso: date.iso })}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SummaryEditor
        summary={view}
        selected={selected}
        onMark={(studentId, iso, status) => update((current) => setMark(current, iso, group.id, studentId, status))}
      />

      <div className="actions">
        <button type="button" className="primary" disabled={busy || view.students.length === 0 || view.dates.length === 0} onClick={download}>
          {busy ? "እየተዘጋጀ ነው…" : "ማጠቃለያውን እንደ ፒዲኤፍ አውርድ"}
        </button>
        <Link className="ghost link-button" href={back}>
          ወደ መዝገብ ተመለስ
        </Link>
      </div>
      {feedback ? <p className={`feedback ${feedback.type}`}>{feedback.text}</p> : null}
    </Shell>
  );
}

function DateCalendar({ monthIso, weekday, recorded, chosen, onToggle, onMonth, onRecorded, onClear }) {
  const first = parseISO(monthIso);
  const year = first.getFullYear();
  const month = first.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const recordedSet = new Set(recorded);
  const chosenSet = new Set(chosen);

  return (
    <section className="date-pick">
      <div className="date-pick-top">
        <h2>ቀን መቁጠሪያ</h2>
        <p>{chosen.length} ቀን ተመርጧል</p>
      </div>
      <div className="calendar-nav">
        <button type="button" onClick={() => onMonth(-1)}>
          ያለፈው ወር
        </button>
        <strong>{formatMonth(monthIso)}</strong>
        <button type="button" onClick={() => onMonth(1)}>
          የሚቀጥለው ወር
        </button>
      </div>
      <div className="calendar-grid" role="grid" aria-label={formatMonth(monthIso)}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="calendar-label">
            {label}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const iso = toISO(new Date(year, month, day));
          const selectable = parseISO(iso).getDay() === weekday;
          if (!selectable) {
            return (
              <span key={iso} className="calendar-day is-quiet">
                {day}
              </span>
            );
          }
          const isChosen = chosenSet.has(iso);
          const hasRecord = recordedSet.has(iso);
          return (
            <button
              key={iso}
              type="button"
              className={`calendar-day${isChosen ? " is-chosen" : ""}${hasRecord ? " has-record" : ""}`}
              aria-pressed={isChosen}
              aria-label={formatAmharicDate(iso)}
              onClick={() => onToggle(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button type="button" className="ghost" onClick={onRecorded} disabled={recorded.length === 0}>
          የተመዘገቡትን ምረጥ
        </button>
        <button type="button" className="ghost" onClick={onClear} disabled={chosen.length === 0}>
          ምርጫውን አንሳ
        </button>
      </div>
    </section>
  );
}

function SummaryEditor({ summary, selected, onMark }) {
  const student = summary.students.find((item) => item.id === selected?.studentId);
  const dateIndex = summary.dates.findIndex((item) => item.iso === selected?.iso);
  const date = dateIndex >= 0 ? summary.dates[dateIndex] : null;
  const status = student && date ? student.marks[dateIndex] : "";
  if (!student || !date) return null;

  return (
    <section className="summary-edit">
      <p>
        <strong>{student.name}</strong>
        {` · ${date.day} ${date.month} ${date.year}`}
      </p>
      <div className="status-grid" role="group" aria-label="ምልክት ቀይር">
        {STATUS_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`status status-${key}`}
            aria-pressed={status === key}
            onClick={() => onMark(student.id, date.iso, key)}
          >
            {STATUS_NAME[key]}
          </button>
        ))}
      </div>
    </section>
  );
}

function NameCell({ name, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const cancelRef = useRef(false);

  if (!editing) {
    return (
      <button
        type="button"
        className="name"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        {name}
      </button>
    );
  }

  return (
    <input
      className="name-input"
      value={draft}
      autoFocus
      maxLength={80}
      aria-label="የተማሪ ስም"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (!cancelRef.current) {
          const trimmed = draft.trim();
          if (trimmed && trimmed !== name) onRename(trimmed);
        }
        cancelRef.current = false;
        setEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelRef.current = true;
          setDraft(name);
          setEditing(false);
        }
      }}
    />
  );
}
