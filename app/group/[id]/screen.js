"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReportPanel from "../../../components/ReportPanel";
import Shell from "../../../components/Shell";
import { useStore } from "../../../components/useStore";
import { submitReport } from "../../../lib/send-report";
import {
  STATUS_BUTTON,
  addStudents,
  buildReport,
  classDay,
  commitGroupName,
  formatAmharicDate,
  groupProgress,
  initialClassDate,
  isISODate,
  nearestDateForDay,
  renameGroup,
  renameStudent,
  removeStudent,
  setCompleted,
  setGroupNote,
  setLastDate,
  setMark,
  setTeacherName,
  shiftWeek,
  studentsFor,
} from "../../../lib/model";

const STATUS_KEYS = ["present", "absent", "permission"];

export default function GroupScreen() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();
  const id = params.id;
  const requested = search.get("date") || "";
  const { state, update, ready, storage } = useStore();
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [bulk, setBulk] = useState("");
  const panelRef = useRef(null);
  const seen = useRef(false);
  const wasCompleted = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (isISODate(requested)) return;
    const initial = isISODate(state.lastDate) ? state.lastDate : initialClassDate();
    router.replace(`/group/${id}?date=${initial}`);
  }, [ready, requested, state, router, id]);

  useEffect(() => {
    if (!ready || !isISODate(requested) || state.lastDate === requested) return;
    update((current) => setLastDate(current, requested));
  }, [ready, requested, state, update]);

  const date = isISODate(requested) ? requested : "";
  const group = state?.groups.find((item) => item.id === id);
  const progress = state && date && group ? groupProgress(state, date, group.id) : null;

  useEffect(() => {
    if (!progress) return;
    if (!seen.current) {
      seen.current = true;
      wasCompleted.current = progress.completed;
      return;
    }
    if (progress.completed && !wasCompleted.current && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    wasCompleted.current = progress.completed;
  }, [progress]);

  if (!ready || !date) {
    return (
      <Shell storage={storage}>
        <p className="loading">እየተጫነ ነው…</p>
      </Shell>
    );
  }

  if (!group) {
    return (
      <Shell date={date} storage={storage}>
        <section className="notice">
          <h1>ይህ ቡድን አልተገኘም</h1>
          <Link className="primary link-button" href={`/?date=${date}`}>
            ተመለስ
          </Link>
        </section>
      </Shell>
    );
  }

  const day = classDay(date);
  if (group.day !== day) {
    const target = nearestDateForDay(date, group.day);
    return (
      <Shell date={date} storage={storage}>
        <section className="notice">
          <p className="eyebrow">{formatAmharicDate(date)}</p>
          <h1>{group.name}</h1>
          <p>
            {group.day === "friday"
              ? "ይህ የአርብ ቡድን ነው። መዝገቡ የሚሞላው አርብ ብቻ ነው።"
              : "ይህ የቅዳሜ ቡድን ነው። መዝገቡ የሚሞላው ቅዳሜ ብቻ ነው።"}
          </p>
          <div className="actions">
            <Link className="primary link-button" href={`/group/${group.id}?date=${target}`}>
              ወደ {group.day === "friday" ? "አርብ" : "ቅዳሜ"} ሂድ
            </Link>
            <Link className="ghost link-button" href={`/?date=${date}`}>
              ተመለስ
            </Link>
          </div>
        </section>
      </Shell>
    );
  }

  const students = studentsFor(state, group.id);

  function changeWeek(weeks) {
    setFeedback(null);
    router.push(`/group/${group.id}?date=${shiftWeek(date, weeks)}`);
  }
  const record = state.records?.[date]?.groups?.[group.id];

  async function runReport(mode) {
    setBusy(mode);
    setFeedback(null);
    try {
      const message = await submitReport(buildReport(state, date, [group.id]), mode);
      setFeedback({ type: "ok", text: message });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell date={date} storage={storage}>
      <p className="back-row">
        <Link href={`/?date=${date}`}>← ወደ ቡድኖች</Link>
      </p>
      <section className="hero">
        <p className="eyebrow">{formatAmharicDate(date)}</p>
        <h1>{group.name}</h1>
        <p>የተማሪዎች ስም በየሳምንቱ ይቆያል። ለዚህ ቀን ብቻ ተገኝተዋል፣ ቀርተዋል ወይም ፈቃድ ጠይቀዋል ይምረጡ።</p>
      </section>

      <section className="datebar">
        <button type="button" onClick={() => changeWeek(-1)}>
          ያለፈው ሳምንት
        </button>
        <p className="week-hint">የዚህ ሳምንት ምልክት</p>
        <button type="button" onClick={() => changeWeek(1)}>
          የሚቀጥለው ሳምንት
        </button>
      </section>

      <label className="field">
        <span>የቡድን ስም</span>
        <input
          value={group.name}
          maxLength={80}
          onChange={(event) => update((current) => renameGroup(current, group.id, event.target.value))}
          onBlur={() => update((current) => commitGroupName(current, group.id))}
        />
      </label>

      <section className="progress-card">
        <div className="progress-top">
          <strong>
            {progress.marked} ከ {progress.total} ተመዝግበዋል
          </strong>
          <span>{progress.completed ? "ተጠናቋል" : progress.total === 0 ? "ተማሪ የለም" : "በሂደት ላይ"}</span>
        </div>
        <div
          className="track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.marked}
          aria-label="የተመዘገቡ ተማሪዎች"
        >
          <span style={{ width: progress.total ? `${(progress.marked / progress.total) * 100}%` : "0%" }} />
        </div>
        <ul className="counts">
          <li>
            ተገኝተዋል <strong>{progress.present}</strong>
          </li>
          <li>
            ቀርተዋል <strong>{progress.absent}</strong>
          </li>
          <li>
            ፈቃድ <strong>{progress.permission}</strong>
          </li>
        </ul>
      </section>

      {students.length === 0 ? (
        <section className="notice compact">
          <h2>እስካሁን ተማሪ የለም</h2>
          <p>ስሞቹን አንድ ጊዜ ይጨምሩ። ከዚያ በኋላ በየሳምንቱ ይቀራሉ፤ ለእያንዳንዱ ሳምንት ምልክቱን ብቻ ይሙሉ።</p>
        </section>
      ) : (
        <ol className="students">
          {students.map((student, index) => (
            <StudentRow
              key={student.id}
              index={index}
              student={student}
              status={record?.marks?.[student.id] || ""}
              onRename={(name) => update((current) => renameStudent(current, student.id, name))}
              onRemove={() => {
                if (window.confirm(`«${student.name}» ከዝርዝሩ ይውጣ?`)) {
                  update((current) => removeStudent(current, student.id));
                }
              }}
              onMark={(status) => update((current) => setMark(current, date, group.id, student.id, status))}
            />
          ))}
        </ol>
      )}

      <AddStudentForm onAdd={(name) => update((current) => addStudents(current, group.id, [name], date))} />

      <details className="bulk">
        <summary>ብዙ ስሞችን ጨምር</summary>
        <textarea
          value={bulk}
          rows={5}
          maxLength={4000}
          placeholder="እያንዳንዱን ስም በአዲስ መስመር ይጻፉ"
          onChange={(event) => setBulk(event.target.value)}
        />
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const names = bulk.split(/\n/);
            update((current) => addStudents(current, group.id, names, date));
            setBulk("");
          }}
        >
          ሁሉን ጨምር
        </button>
      </details>

      {progress.completed ? (
        <div ref={panelRef}>
          <div className="actions">
            <button
              type="button"
              className="ghost"
              onClick={() => update((current) => setCompleted(current, date, group.id, false))}
            >
              እንደገና አርም
            </button>
          </div>
          <ReportPanel
            title="የዚህ ቡድን ሪፖርት"
            description="መዝገቡ ተጠናቋል። የፒዲኤፍ ሪፖርቱ ወደ ኢሜይሉ ይላካል።"
            teacherName={state.teacherName}
            onTeacherName={(name) => update((current) => setTeacherName(current, name))}
            note={record?.note || ""}
            onNote={(note) => update((current) => setGroupNote(current, date, group.id, note))}
            sendLabel="የዚህ ቡድን ሪፖርት ላክ"
            busy={busy}
            feedback={feedback}
            onSend={() => runReport("email")}
            onDownload={() => runReport("download")}
          />
        </div>
      ) : (
        <section className="finish-box">
          <p>
            {progress.total === 0
              ? "በመጀመሪያ የተማሪዎችን ስም ይጨምሩ። ስሞቹ በየሳምንቱ ይቀራሉ።"
              : progress.marked === 0
                ? "ስሞቹ ተቀምጠዋል። ለዚህ ሳምንት ብቻ ምልክት ያድርጉ።"
                : progress.marked < progress.total
                  ? "ሁሉም ተማሪዎች ተገኝተዋል፣ ቀርተዋል ወይም ፈቃድ ጠይቀዋል ተብለው ሊመዘገቡ ይገባል።"
                  : "ሁሉም ተማሪዎች ተመዝግበዋል። መዝገቡን ይጨርሱና ሪፖርቱን ይላኩ።"}
          </p>
          <button
            type="button"
            className="primary"
            disabled={progress.total === 0 || progress.marked !== progress.total}
            onClick={() => update((current) => setCompleted(current, date, group.id, true))}
          >
            መዝገቡን ጨርስ
          </button>
        </section>
      )}
    </Shell>
  );
}

function AddStudentForm({ onAdd }) {
  const [name, setName] = useState("");
  return (
    <form
      className="add-form"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setName("");
      }}
    >
      <label className="field">
        <span>የተማሪ ስም</span>
        <input
          value={name}
          maxLength={80}
          placeholder="ስም እዚህ ይጻፉ"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button type="submit" className="primary">
        ጨምር
      </button>
    </form>
  );
}

function StudentRow({ index, student, status, onRename, onRemove, onMark }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(student.name);
  const cancelRef = useRef(false);

  return (
    <li className="student" data-status={status || "none"}>
      <div className="student-top">
        <span className="num">{index + 1}</span>
        {editing ? (
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
                if (trimmed && trimmed !== student.name) onRename(trimmed);
              }
              cancelRef.current = false;
              setEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                cancelRef.current = true;
                setDraft(student.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button type="button" className="name" onClick={() => {
            setDraft(student.name);
            setEditing(true);
          }}>
            {student.name}
          </button>
        )}
        <button type="button" className="linkish" onClick={onRemove}>
          አስወግድ
        </button>
      </div>
      <div className="status-grid" role="group" aria-label={`${student.name} ሁኔታ`}>
        {STATUS_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={`status status-${key}`}
            aria-pressed={status === key}
            onClick={() => onMark(key)}
          >
            <span>{STATUS_BUTTON[key].title}</span>
            {STATUS_BUTTON[key].detail ? <small>{STATUS_BUTTON[key].detail}</small> : null}
          </button>
        ))}
      </div>
    </li>
  );
}
