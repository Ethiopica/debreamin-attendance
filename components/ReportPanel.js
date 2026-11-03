"use client";

import { REPORT_EMAIL } from "../lib/model";

export default function ReportPanel({
  title,
  description,
  teacherName,
  onTeacherName,
  note,
  onNote,
  noteLabel = "ማስታወሻ",
  sendLabel,
  busy,
  feedback,
  onSend,
  onDownload,
}) {
  return (
    <section className="report-panel" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="recipient">
        ተቀባይ፦ <strong>{REPORT_EMAIL}</strong>
      </p>
      <label className="field">
        <span>የመምህር ስም</span>
        <input
          value={teacherName}
          maxLength={80}
          autoComplete="name"
          onChange={(event) => onTeacherName(event.target.value)}
        />
      </label>
      <label className="field">
        <span>{noteLabel}</span>
        <textarea value={note} maxLength={500} rows={3} onChange={(event) => onNote(event.target.value)} />
      </label>
      <div className="actions">
        <button type="button" className="primary" disabled={Boolean(busy)} onClick={onSend}>
          {busy === "email" ? "እየተላከ ነው…" : sendLabel}
        </button>
        <button type="button" className="ghost" disabled={Boolean(busy)} onClick={onDownload}>
          {busy === "download" ? "እየተዘጋጀ ነው…" : "ፒዲኤፍ አውርድ"}
        </button>
      </div>
      {feedback ? (
        <p className={feedback.type === "ok" ? "feedback ok" : "feedback error"} role="status">
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}
