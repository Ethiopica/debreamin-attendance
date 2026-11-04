export const REPORT_EMAILS = ["bluenile.ojulu890@gmail.com", "kalkidanbelew27@gmail.com"];
export const REPORT_EMAIL = REPORT_EMAILS.join("፣ ");

export const STATUS_LABEL = {
  present: "ተገኝተዋል",
  absent: "ቀርተዋል",
  permission: "ፈቃድ ጠይቀዋል",
};

export const STATUS_BUTTON = {
  present: { title: "ተገኝተዋል", detail: "" },
  absent: { title: "ቀርተዋል", detail: "" },
  permission: { title: "ፈቃድ", detail: "ጠይቀዋል" },
};

export const DEFAULT_GROUPS = [
  { id: "sat-1", day: "saturday", name: "የቅዳሜ የመጀመሪያ ቡድን" },
  { id: "sat-2", day: "saturday", name: "የቅዳሜ ሁለተኛ ቡድን" },
  { id: "sat-3", day: "saturday", name: "የቅዳሜ ሦስተኛ ቡድን" },
  { id: "fri-1", day: "friday", name: "የአርብ ቡድን" },
];

const WEEKDAYS = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "አርብ", "ቅዳሜ"];
const MONTHS = [
  "ጃንዩወሪ",
  "ፌብሩወሪ",
  "ማርች",
  "ኤፕሪል",
  "ሜይ",
  "ጁን",
  "ጁላይ",
  "ኦገስት",
  "ሴፕቴምበር",
  "ኦክቶበር",
  "ኖቬምበር",
  "ዲሴምበር",
];

const STORAGE_KEY = "attendance-am-v1";
const MAX_STUDENTS = 200;

export function emptyState() {
  return {
    teacherName: "",
    lastDate: "",
    groups: DEFAULT_GROUPS.map((group) => ({ ...group })),
    students: [],
    records: {},
  };
}

export function isISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  return toISO(parseISO(value)) === value;
}

export function parseISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function classDay(iso) {
  const day = parseISO(iso).getDay();
  if (day === 5) return "friday";
  if (day === 6) return "saturday";
  return null;
}

const SHORT_MONTHS = ["ጃን", "ፌብ", "ማር", "ኤፕ", "ሜይ", "ጁን", "ጁላ", "ኦገ", "ሴፕ", "ኦክ", "ኖቬ", "ዲሴ"];

export function formatAmharicDate(iso) {
  const date = parseISO(iso);
  return `${WEEKDAYS[date.getDay()]}፣ ${MONTHS[date.getMonth()]} ${date.getDate()}፣ ${date.getFullYear()}`;
}

export function formatMonth(iso) {
  const date = parseISO(iso);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatShortDate(iso) {
  const date = parseISO(iso);
  return {
    day: String(date.getDate()),
    month: SHORT_MONTHS[date.getMonth()],
    year: String(date.getFullYear()),
  };
}

export function formatAmharicStamp(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatAmharicDate(toISO(date))} ${hours}:${minutes}`;
}

export function initialClassDate(now = new Date()) {
  const day = now.getDay();
  if (day === 5 || day === 6) return toISO(now);
  if (day === 0) {
    const previous = new Date(now);
    previous.setDate(previous.getDate() - 1);
    return toISO(previous);
  }
  const friday = new Date(now);
  friday.setDate(friday.getDate() + (5 - day));
  return toISO(friday);
}

export function stepClassDay(iso, direction) {
  const date = parseISO(iso);
  do {
    date.setDate(date.getDate() + direction);
  } while (date.getDay() !== 5 && date.getDay() !== 6);
  return toISO(date);
}

export function upcomingWeekday(iso, weekday) {
  const date = parseISO(iso);
  if (date.getDay() === weekday) return iso;
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() !== weekday);
  return toISO(date);
}

export function nearestDateForDay(iso, dayName) {
  const target = dayName === "friday" ? 5 : 6;
  const date = parseISO(iso);
  if (date.getDay() === target) return iso;
  const forward = new Date(date);
  const back = new Date(date);
  do {
    forward.setDate(forward.getDate() + 1);
  } while (forward.getDay() !== target);
  do {
    back.setDate(back.getDate() - 1);
  } while (back.getDay() !== target);
  const forwardDays = forward.getTime() - date.getTime();
  const backDays = date.getTime() - back.getTime();
  return toISO(forwardDays <= backDays ? forward : back);
}

export function loadState() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function groupsForDay(state, iso) {
  const day = classDay(iso);
  if (!day) return [];
  return state.groups.filter((group) => group.day === day);
}

export function studentsFor(state, groupId) {
  return state.students.filter((student) => student.groupId === groupId);
}

export function shiftWeek(iso, weeks) {
  const date = parseISO(iso);
  date.setDate(date.getDate() + weeks * 7);
  return toISO(date);
}

export function groupProgress(state, iso, groupId) {
  const students = studentsFor(state, groupId);
  const record = state.records?.[iso]?.groups?.[groupId];
  const statuses = students.map((student) => {
    const value = record?.marks?.[student.id];
    return STATUS_LABEL[value] ? value : "";
  });
  const summary = summarize(statuses);
  return {
    ...summary,
    completed: Boolean(record?.completed),
  };
}

export function summarize(statusesOrStudents) {
  const statuses = statusesOrStudents.map((item) => (typeof item === "string" ? item : item.status));
  return {
    total: statuses.length,
    present: statuses.filter((status) => status === "present").length,
    absent: statuses.filter((status) => status === "absent").length,
    permission: statuses.filter((status) => status === "permission").length,
    marked: statuses.filter((status) => STATUS_LABEL[status]).length,
  };
}

export function setTeacherName(state, name) {
  const next = structuredClone(state);
  next.teacherName = String(name || "").slice(0, 80);
  return next;
}

export function setLastDate(state, iso) {
  if (state.lastDate === iso) return state;
  const next = structuredClone(state);
  next.lastDate = iso;
  return next;
}

export function renameGroup(state, groupId, name) {
  const next = structuredClone(state);
  const group = next.groups.find((item) => item.id === groupId);
  if (!group) return state;
  group.name = String(name || "").slice(0, 80);
  return next;
}

export function commitGroupName(state, groupId) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return state;
  const fallback = DEFAULT_GROUPS.find((item) => item.id === groupId).name;
  const trimmed = group.name.trim() || fallback;
  if (trimmed === group.name) return state;
  const next = structuredClone(state);
  next.groups.find((item) => item.id === groupId).name = trimmed;
  return next;
}

export function addStudents(state, groupId, names, iso) {
  const existing = studentsFor(state, groupId).length;
  let room = MAX_STUDENTS - existing;
  const additions = [];
  for (const name of names) {
    const trimmed = String(name || "").trim().slice(0, 80);
    if (!trimmed || room <= 0) continue;
    additions.push({
      id: createId(),
      groupId,
      name: trimmed,
      createdOn: isISODate(iso) ? iso : "",
    });
    room -= 1;
  }
  if (!additions.length) return state;
  const next = structuredClone(state);
  next.students.push(...additions);
  const record = next.records?.[iso]?.groups?.[groupId];
  if (record) record.completed = false;
  return next;
}

export function renameStudent(state, studentId, name) {
  const trimmed = String(name || "").trim().slice(0, 80);
  if (!trimmed) return state;
  const student = state.students.find((item) => item.id === studentId);
  if (!student || student.name === trimmed) return state;
  const next = structuredClone(state);
  next.students.find((item) => item.id === studentId).name = trimmed;
  return next;
}

export function removeStudent(state, studentId) {
  if (!state.students.some((student) => student.id === studentId)) return state;
  const next = structuredClone(state);
  next.students = next.students.filter((student) => student.id !== studentId);
  for (const day of Object.values(next.records)) {
    for (const group of Object.values(day.groups || {})) {
      if (group.marks) delete group.marks[studentId];
    }
  }
  return next;
}

export function setMark(state, iso, groupId, studentId, status) {
  if (!STATUS_LABEL[status]) return state;
  const current = state.records?.[iso]?.groups?.[groupId]?.marks?.[studentId];
  if (current === status) return state;
  const next = structuredClone(state);
  const record = ensureGroupRecord(next, iso, groupId);
  record.marks[studentId] = status;
  record.completed = false;
  return next;
}

export function setCompleted(state, iso, groupId, completed) {
  const students = studentsFor(state, groupId);
  const record = state.records?.[iso]?.groups?.[groupId];
  if (completed) {
    const ready =
      students.length > 0 &&
      students.every((student) => STATUS_LABEL[record?.marks?.[student.id]]);
    if (!ready) return state;
  }
  if (Boolean(record?.completed) === Boolean(completed) && record) return state;
  const next = structuredClone(state);
  ensureGroupRecord(next, iso, groupId).completed = Boolean(completed);
  return next;
}

export function setGroupNote(state, iso, groupId, note) {
  const next = structuredClone(state);
  ensureGroupRecord(next, iso, groupId).note = String(note || "").slice(0, 500);
  return next;
}

export function setDayNote(state, iso, note) {
  const next = structuredClone(state);
  ensureDay(next, iso).note = String(note || "").slice(0, 500);
  return next;
}

export function studiedDates(state, groupId) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return [];
  return Object.keys(state.records || {})
    .filter((iso) => isISODate(iso) && classDay(iso) === group.day)
    .filter((iso) => {
      const marks = state.records?.[iso]?.groups?.[groupId]?.marks || {};
      return Object.values(marks).some((status) => STATUS_LABEL[status]);
    })
    .sort();
}

export function filterSummary(summary, isos) {
  const chosen = new Set(Array.isArray(isos) ? isos : []);
  const indexes = summary.dates
    .map((date, index) => (chosen.has(date.iso) ? index : -1))
    .filter((index) => index >= 0);
  const dates = indexes.map((index) => summary.dates[index]);
  const students = summary.students.map((student) => {
    const marks = indexes.map((index) => student.marks[index] || "");
    const counts = summarize(marks);
    return {
      ...student,
      marks,
      present: counts.present,
      absent: counts.absent,
      permission: counts.permission,
    };
  });
  return { ...summary, dates, students };
}

export function buildGroupSummary(state, groupId, isos) {
  const group = state.groups.find((item) => item.id === groupId);
  if (!group) return null;
  const dates = Array.isArray(isos)
    ? [...new Set(isos.filter((iso) => isISODate(iso) && classDay(iso) === group.day))].sort()
    : studiedDates(state, groupId);
  const students = studentsFor(state, groupId).map((student) => {
    const marks = dates.map((iso) => {
      const value = state.records?.[iso]?.groups?.[groupId]?.marks?.[student.id];
      return STATUS_LABEL[value] ? value : "";
    });
    const counts = summarize(marks);
    return {
      id: student.id,
      name: student.name.trim(),
      marks,
      present: counts.present,
      absent: counts.absent,
      permission: counts.permission,
    };
  });
  return {
    groupId: group.id,
    groupName: group.name.trim(),
    day: group.day,
    teacherName: state.teacherName.trim(),
    generatedAt: formatAmharicStamp(new Date()),
    dates: dates.map((iso) => ({ iso, ...formatShortDate(iso) })),
    students,
  };
}

export function normalizeSummary(body) {
  const groupId = cleanText(body?.groupId, 20);
  const known = DEFAULT_GROUPS.find((group) => group.id === groupId);
  const seen = new Set();
  const dates = [];
  if (Array.isArray(body?.dates)) {
    for (const item of body.dates) {
      const iso = cleanText(typeof item === "string" ? item : item?.iso, 10);
      if (!isISODate(iso) || seen.has(iso)) continue;
      seen.add(iso);
      dates.push({ iso, ...formatShortDate(iso) });
    }
  }
  const students = Array.isArray(body?.students)
    ? body.students.map((student) => ({
        name: cleanText(student?.name, 80),
        marks: Array.isArray(student?.marks)
          ? student.marks.map((status) => (STATUS_LABEL[status] ? status : ""))
          : [],
      }))
    : [];
  return {
    groupId,
    groupName: cleanText(body?.groupName, 80) || known?.name || "",
    day: known?.day || "",
    teacherName: cleanText(body?.teacherName, 80),
    generatedAt: cleanText(body?.generatedAt, 80),
    dates,
    students: students.map((student) => {
      const counts = summarize(student.marks);
      return { ...student, present: counts.present, absent: counts.absent, permission: counts.permission };
    }),
  };
}

export function validateSummary(summary) {
  const known = DEFAULT_GROUPS.find((group) => group.id === summary.groupId);
  if (!known || summary.day !== known.day) return "የቡድኑ መረጃ ትክክል አይደለም።";
  if (!summary.groupName) return "የቡድን ስም ያስፈልጋል።";
  if (summary.dates.length > 400) return "የቀናት ብዛት ከፍ ያለ ነው።";
  if (!summary.students.length) return "ማጠቃለያው ቢያንስ አንድ ተማሪ ይፈልጋል።";
  if (summary.students.length > MAX_STUDENTS) return "የተማሪዎች ብዛት ከፍ ያለ ነው።";
  for (const date of summary.dates) {
    if (!isISODate(date.iso) || classDay(date.iso) !== known.day) return "የማጠቃለያው ቀን ከቡድኑ ቀን ጋር አይዛመድም።";
  }
  for (const student of summary.students) {
    if (!student.name) return "የተማሪ ስም ያስፈልጋል።";
    if (student.marks.length !== summary.dates.length) return "የማጠቃለያው ሰንጠረዥ አልተሟላም።";
    if (student.marks.some((status) => status && !STATUS_LABEL[status])) return "የመገኘት ምልክቱ ትክክል አይደለም።";
  }
  return "";
}

export function buildReport(state, iso, groupIds) {
  return {
    date: iso,
    dateLabel: formatAmharicDate(iso),
    generatedAt: formatAmharicStamp(new Date()),
    teacherName: state.teacherName.trim(),
    dayNote: (state.records?.[iso]?.note || "").trim(),
    groups: groupIds.map((id) => {
      const group = state.groups.find((item) => item.id === id);
      const record = state.records?.[iso]?.groups?.[id];
      return {
        id,
        name: (group?.name || "").trim(),
        note: (record?.note || "").trim(),
        students: studentsFor(state, id)
          .map((student) => ({
            name: student.name.trim(),
            status: STATUS_LABEL[record?.marks?.[student.id]] ? record.marks[student.id] : "",
          }))
          .filter((student) => student.status),
      };
    }),
  };
}

export function cleanText(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

export function normalizeReport(body) {
  return {
    date: cleanText(body?.date, 10),
    dateLabel: cleanText(body?.dateLabel, 80),
    generatedAt: cleanText(body?.generatedAt, 80),
    teacherName: cleanText(body?.teacherName, 80),
    dayNote: cleanText(body?.dayNote, 500),
    groups: Array.isArray(body?.groups)
      ? body.groups.map((group) => ({
          id: cleanText(group?.id, 20),
          name: cleanText(group?.name, 80),
          note: cleanText(group?.note, 500),
          students: Array.isArray(group?.students)
            ? group.students.map((student) => ({
                name: cleanText(student?.name, 80),
                status: cleanText(student?.status, 20),
              }))
            : [],
        }))
      : [],
  };
}

export function validateReport(report) {
  if (!isISODate(report.date)) return "ቀኑ ትክክል አይደለም።";
  const day = classDay(report.date);
  if (!day) return "አቴንዳንስ የሚላከው አርብ ወይም ቅዳሜ ብቻ ነው።";
  if (!Array.isArray(report.groups) || report.groups.length === 0 || report.groups.length > 3) {
    return "የቡድን መረጃው ትክክል አይደለም።";
  }
  const ids = report.groups.map((group) => group.id);
  if (new Set(ids).size !== ids.length) return "ቡድኑ ተደጋግሟል።";
  for (const group of report.groups) {
    const known = DEFAULT_GROUPS.find((item) => item.id === group.id);
    if (!known || known.day !== day) return "የቡድኑ ቀን ከተመረጠው ቀን ጋር አይዛመድም።";
    if (!group.name) return "የቡድን ስም ያስፈልጋል።";
    if (!group.students.length) return "እያንዳንዱ ቡድን ቢያንስ አንድ ተማሪ ሊኖረው ይገባል።";
    if (group.students.length > MAX_STUDENTS) return "የተማሪዎች ብዛት ከፍ ያለ ነው።";
    for (const student of group.students) {
      if (!student.name) return "የተማሪ ስም ያስፈልጋል።";
      if (!STATUS_LABEL[student.status]) return "ሁሉም ተማሪዎች ሊመዘገቡ ይገባል።";
    }
  }
  return "";
}

function ensureDay(state, iso) {
  if (!state.records[iso]) state.records[iso] = { note: "", groups: {} };
  if (!state.records[iso].groups) state.records[iso].groups = {};
  if (typeof state.records[iso].note !== "string") state.records[iso].note = "";
  return state.records[iso];
}

function ensureGroupRecord(state, iso, groupId) {
  const day = ensureDay(state, iso);
  if (!day.groups[groupId]) {
    day.groups[groupId] = { marks: {}, completed: false, note: "" };
  }
  const record = day.groups[groupId];
  if (!record.marks) record.marks = {};
  if (typeof record.note !== "string") record.note = "";
  return record;
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function coerceState(value) {
  return normalize(value);
}

function normalize(parsed) {
  const state = emptyState();
  state.teacherName = typeof parsed?.teacherName === "string" ? parsed.teacherName.slice(0, 80) : "";
  state.lastDate = isISODate(parsed?.lastDate) ? parsed.lastDate : "";
  const storedGroups = Array.isArray(parsed?.groups) ? parsed.groups : [];
  state.groups = DEFAULT_GROUPS.map((group) => {
    const stored = storedGroups.find((item) => item?.id === group.id);
    const name = typeof stored?.name === "string" ? stored.name.trim() : "";
    return { ...group, name: name || group.name };
  });
  state.students = Array.isArray(parsed?.students)
    ? parsed.students.filter(validStudent).map((student) => ({
        id: student.id,
        groupId: student.groupId,
        name: student.name.trim().slice(0, 80),
        createdOn: isISODate(student.createdOn) ? student.createdOn : "",
      }))
    : [];
  state.records = parsed?.records && typeof parsed.records === "object" ? parsed.records : {};
  return state;
}

function validStudent(student) {
  return (
    student &&
    typeof student.id === "string" &&
    typeof student.name === "string" &&
    student.name.trim() &&
    DEFAULT_GROUPS.some((group) => group.id === student.groupId)
  );
}
