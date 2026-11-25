import { readFileSync } from "node:fs";
import { buildAttendancePdf, buildSummaryPdf } from "../lib/pdf.js";
import { buildGroupSummary, buildReport, validateReport, validateSummary } from "../lib/model.js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const { createClient } = await import("@supabase/supabase-js");
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client.rpc("load_attendance");
if (error) throw error;

const dates = Object.keys(data.records || {}).sort();
console.log("dates", dates.join(","));

for (const iso of dates) {
  const day = data.records[iso];
  const ids = Object.keys(day.groups || {});
  if (!ids.length) continue;
  const report = buildReport(data, iso, ids);
  const problem = validateReport(report);
  console.log("report", iso, "groups", report.groups.map((group) => `${group.id}:${group.students.length}`).join(" "), "valid", problem || "ok");
  if (!problem && report.groups.length > 1) {
    try {
      const pdf = await buildAttendancePdf(report);
      console.log("multi pdf bytes", pdf.length);
    } catch (caught) {
      console.log("multi pdf FAILED", caught.message);
    }
  }
}

const summary = buildGroupSummary(data, "sat-1");
const summaryProblem = validateSummary(summary);
console.log("summary dates", summary.dates.length, "students", summary.students.length, "valid", summaryProblem || "ok");
try {
  const pdf = await buildSummaryPdf(summary);
  console.log("summary pdf bytes", pdf.length);
} catch (caught) {
  console.log("summary pdf FAILED", caught.stack || caught.message);
}
