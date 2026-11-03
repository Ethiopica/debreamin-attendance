import { summarize } from "./model";

export function emailSubject(report) {
  if (report.groups.length === 1) {
    return `የአቴንዳንስ ሪፖርት — ${report.groups[0].name} — ${report.dateLabel}`;
  }
  return `የአቴንዳንስ ሪፖርት — ${report.dateLabel}`;
}

export function emailBody(report) {
  const lines = ["የአቴንዳንስ ሪፖርት", report.dateLabel];
  if (report.teacherName) lines.push(`መምህር፦ ${report.teacherName}`);
  if (report.generatedAt) lines.push(`የተዘጋጀበት ጊዜ፦ ${report.generatedAt}`);
  if (report.dayNote) lines.push(`ማስታወሻ፦ ${report.dayNote}`);
  lines.push("");

  for (const group of report.groups) {
    const counts = summarize(group.students);
    lines.push(group.name);
    lines.push(`ጠቅላላ፦ ${counts.total}`);
    lines.push(`ተገኝተዋል፦ ${counts.present}`);
    lines.push(`ቀርተዋል፦ ${counts.absent}`);
    lines.push(`ፈቃድ ጠይቀዋል፦ ${counts.permission}`);
    const absent = namesFor(group, "absent");
    const permission = namesFor(group, "permission");
    if (absent.length) lines.push(`የቀሩት፦ ${absent.join("፣ ")}`);
    if (permission.length) lines.push(`ፈቃድ የጠየቁ፦ ${permission.join("፣ ")}`);
    if (group.note) lines.push(`ማስታወሻ፦ ${group.note}`);
    lines.push("");
  }

  lines.push("ሙሉ ዝርዝሩ በተያያዘው ፒዲኤፍ ውስጥ አለ።");
  return lines.join("\n");
}

function namesFor(group, status) {
  return group.students.filter((student) => student.status === status).map((student) => student.name);
}
