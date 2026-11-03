"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Shell from "../../../../components/Shell";
import { useStore } from "../../../../components/useStore";
import { buildGroupSummary, isISODate } from "../../../../lib/model";
import { downloadSummary } from "../../../../lib/send-report";

const STATUS_NAME = {
  present: "ተገኝተዋል",
  absent: "ቀርተዋል",
  permission: "ፈቃድ ጠይቀዋል",
};

export default function SummaryScreen() {
  const params = useParams();
  const id = params.id;
  const { state, ready, storage } = useStore();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

  const summary = buildGroupSummary(state, group.id);
  const back = isISODate(state.lastDate) ? `/group/${group.id}?date=${state.lastDate}` : `/group/${group.id}`;
  const dayWord = group.day === "friday" ? "አርብ" : "ቅዳሜ";

  async function download() {
    setBusy(true);
    setFeedback(null);
    try {
      const message = await downloadSummary(summary);
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
        <p>
          {summary.dates.length
            ? `${summary.dates.length} ${dayWord} ተመዝግቧል። ስሞቹ በግራ፣ የእያንዳንዱ ቀን ምልክት ከላይ ነው።`
            : "እስካሁን የተመዘገበ ቀን የለም። ስሞቹ ተቀምጠዋል። ቀን ሲመዘገብ ወደዚህ ሰንጠረዥ ይጨመራል።"}
        </p>
      </section>

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

      {summary.students.length === 0 ? (
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
                {summary.dates.map((date, index) => (
                  <th key={date.iso} className="date-head">
                    <span>{date.day}</span>
                    <small>{date.month}</small>
                    {index === 0 || date.year !== summary.dates[index - 1].year ? <small>{date.year}</small> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.students.map((student, rowIndex) => (
                <tr key={`${rowIndex}-${student.name}`}>
                  <th className="name-col" scope="row">
                    {student.name}
                  </th>
                  <td className="count-col present-ink">{student.present}</td>
                  <td className="count-col absent-ink">{student.absent}</td>
                  <td className="count-col permission-ink">{student.permission}</td>
                  {student.marks.map((status, index) => {
                    const date = summary.dates[index];
                    return (
                      <td
                        key={date.iso}
                        className={status ? `mark-cell mark-${status}` : "mark-cell"}
                        title={`${student.name} · ${date.day} ${date.month} ${date.year} · ${STATUS_NAME[status] || "አልተመዘገበም"}`}
                      >
                        <span className="sr-only">{STATUS_NAME[status] || "አልተመዘገበም"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="actions">
        <button type="button" className="primary" disabled={busy || summary.students.length === 0} onClick={download}>
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
