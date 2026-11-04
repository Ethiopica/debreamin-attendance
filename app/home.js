"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReportPanel from "../components/ReportPanel";
import Shell from "../components/Shell";
import { useSession } from "../components/AuthGate";
import { useStore } from "../components/useStore";
import { submitReport } from "../lib/send-report";
import {
  buildReport,
  classDay,
  formatAmharicDate,
  groupProgress,
  groupsForDay,
  initialClassDate,
  isISODate,
  setDayNote,
  setLastDate,
  setTeacherName,
  shiftWeek,
  stepClassDay,
  upcomingWeekday,
} from "../lib/model";

export default function HomeScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("date") || "";
  const { user } = useSession();
  const { state, update, ready, storage } = useStore();
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!ready) return;
    if (isISODate(requested)) return;
    const initial = isISODate(state.lastDate) ? state.lastDate : initialClassDate();
    router.replace(`/?date=${initial}`, { scroll: false });
  }, [ready, requested, router, state]);

  useEffect(() => {
    if (!ready || !isISODate(requested) || state.lastDate === requested) return;
    update((current) => setLastDate(current, requested));
  }, [ready, requested, state, update]);

  if (!ready || !isISODate(requested)) {
    return (
      <Shell storage={storage}>
        <p className="loading">እየተጫነ ነው…</p>
      </Shell>
    );
  }

  const date = requested;
  const day = classDay(date);
  const allowed = new Set(user?.groups || []);
  const groups = groupsForDay(state, date).filter((group) => allowed.has(group.id));
  const several = groups.length > 1;
  const progressList = groups.map((group) => ({
    group,
    progress: groupProgress(state, date, group.id),
  }));
  const allComplete = progressList.length > 0 && progressList.every((item) => item.progress.completed);

  function changeDate(next) {
    setFeedback(null);
    if (next !== date) router.replace(`/?date=${next}`, { scroll: false });
  }

  async function runReport(mode) {
    setBusy(mode);
    setFeedback(null);
    try {
      const report = buildReport(
        state,
        date,
        groups.map((group) => group.id),
      );
      const message = await submitReport(report, mode);
      setFeedback({ type: "ok", text: message });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Shell date={date} storage={storage}>
      <section className="datebar">
        <button type="button" onClick={() => changeDate(stepClassDay(date, -1))}>
          ያለፈው
        </button>
        <label className="date-field">
          <span>ቀን</span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) changeDate(event.target.value);
            }}
          />
        </label>
        <button type="button" onClick={() => changeDate(stepClassDay(date, 1))}>
          ቀጣይ
        </button>
      </section>

      {day ? (
        <section className="datebar">
          <button type="button" onClick={() => changeDate(shiftWeek(date, -1))}>
            ያለፈው ሳምንት
          </button>
          <p className="week-hint">ስሞቹ ይቀራሉ · ምልክቱ ለዚህ ሳምንት ብቻ</p>
          <button type="button" onClick={() => changeDate(shiftWeek(date, 1))}>
            የሚቀጥለው ሳምንት
          </button>
        </section>
      ) : null}

      {day && groups.length === 0 ? (
        <section className="notice">
          <p className="eyebrow">{formatAmharicDate(date)}</p>
          <h1>ለዚህ ቀን ቡድን አልተፈቀደልዎትም</h1>
          <p>አስተዳዳሪው ለእያንዳንዱ መምህር የሚያየውን ቡድን ብቻ ይመድባል።</p>
        </section>
      ) : day ? (
        <>
          <section className="hero">
            <p className="eyebrow">{day === "friday" ? "የአርብ መዝገብ" : "የቅዳሜ መዝገብ"}</p>
            <h1>{formatAmharicDate(date)}</h1>
            <p>
              {day === "friday"
                ? "የአርብ ቡድንና የተማሪዎች ስም በየሳምንቱ ይቀራሉ። በእያንዳንዱ አርብ ምልክቱን ብቻ ይሙሉ።"
                : several
                  ? "የተፈቀዱት የቅዳሜ ቡድኖችና ስሞቻቸው በየሳምንቱ ይቀራሉ። በእያንዳንዱ ቅዳሜ ምልክቱን ብቻ ይሙሉ።"
                  : "የዚህ ቡድን ስሞች በየሳምንቱ ይቀራሉ። በእያንዳንዱ ቅዳሜ ምልክቱን ብቻ ይሙሉ።"}
            </p>
          </section>

          <div className="cards">
            {progressList.map(({ group, progress }, index) => (
              <article key={group.id} className={`card ${group.id}`}>
                <Link href={`/group/${group.id}?date=${date}`} className="card-main">
                  <div className="card-top">
                    {groups.length > 1 ? <span className="index-badge">{index + 1}</span> : null}
                    <h2>{group.name}</h2>
                    <span className={progress.completed ? "pill done" : "pill"}>{progressLabel(progress)}</span>
                  </div>
                  <p>
                    {progress.total} ተማሪዎች · {progress.marked} ተመዝግበዋል
                  </p>
                  <p className="counts-inline">
                    ተገኝተዋል {progress.present} · ቀርተዋል {progress.absent} · ፈቃድ {progress.permission}
                  </p>
                  <span className="open">መዝገቡን ክፈት</span>
                </Link>
                <Link href={`/group/${group.id}/summary`} className="summary-link">
                  ማጠቃለያ
                </Link>
              </article>
            ))}
          </div>

          {allComplete ? (
            <ReportPanel
              title={several ? "የቡድኖች ሪፖርት" : "የቀኑ ሪፖርት"}
              description={
                several
                  ? "የተፈቀዱት ቡድኖች ተጠናቀዋል። አንድ ላይ የተሰበሰበ ፒዲኤፍ ወደ ኢሜይሉ ይላካል።"
                  : "ቡድኑ ተጠናቋል። ፒዲኤፉ ወደ ኢሜይሉ ይላካል።"
              }
              teacherName={state.teacherName}
              onTeacherName={(name) => update((current) => setTeacherName(current, name))}
              note={state.records?.[date]?.note || ""}
              onNote={(note) => update((current) => setDayNote(current, date, note))}
              noteLabel="የቀኑ ማስታወሻ"
              sendLabel={several ? "የቡድኖችን ሪፖርት ላክ" : "የቀኑን ሪፖርት ላክ"}
              busy={busy}
              feedback={feedback}
              onSend={() => runReport("email")}
              onDownload={() => runReport("download")}
            />
          ) : (
            <section className="wait-note">
              <h2>ሪፖርት</h2>
              <p>
                {several
                  ? "የቀኑ ሪፖርት የሚላከው የተፈቀዱት ቡድኖች ከተጠናቀቁ በኋላ ነው። የተጠናቀቀ ቡድንን ሪፖርት ለብቻው ከመዝገቡ ውስጥ መላክ ይቻላል።"
                  : "ሪፖርቱ የሚላከው ቡድኑ ከተጠናቀቀ በኋላ ነው።"}
              </p>
            </section>
          )}
        </>
      ) : (
        <section className="notice">
          <p className="eyebrow">{formatAmharicDate(date)}</p>
          <h1>በዚህ ቀን ክፍል የለም</h1>
          <p>አቴንዳንስ የሚመዘገበው አርብ ለአንድ ቡድን፣ ቅዳሜ ደግሞ ለሦስት ቡድኖች ነው።</p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => changeDate(upcomingWeekday(date, 5))}>
              ወደ አርብ
            </button>
            <button type="button" className="ghost" onClick={() => changeDate(upcomingWeekday(date, 6))}>
              ወደ ቅዳሜ
            </button>
          </div>
        </section>
      )}
    </Shell>
  );
}

function progressLabel(progress) {
  if (progress.total === 0) return "ተማሪ የለም";
  if (progress.completed) return "ተጠናቋል";
  if (progress.marked === 0) return "አልተጀመረም";
  if (progress.marked === progress.total) return "ለመጨረስ ዝግጁ";
  return "በሂደት ላይ";
}
