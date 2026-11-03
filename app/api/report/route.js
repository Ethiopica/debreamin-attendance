import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { buildAttendancePdf } from "../../../lib/pdf";
import { emailBody, emailSubject } from "../../../lib/report-text";
import {
  REPORT_EMAIL,
  formatAmharicDate,
  formatAmharicStamp,
  normalizeReport,
  validateReport,
} from "../../../lib/model";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "የሪፖርቱ መረጃ አልተነበበም።" }, { status: 400 });
  }

  const mode = body?.mode === "download" ? "download" : body?.mode === "email" ? "email" : "";
  if (!mode) {
    return NextResponse.json({ error: "የመላኪያ አይነቱ አልታወቀም።" }, { status: 400 });
  }

  const report = normalizeReport(body);
  const problem = validateReport(report);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  report.dateLabel = formatAmharicDate(report.date);
  if (!report.generatedAt) report.generatedAt = formatAmharicStamp(new Date());

  let pdf;
  try {
    pdf = await buildAttendancePdf(report);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "ፒዲኤፉ አልተዘጋጀም።" }, { status: 500 });
  }

  if (mode === "download") {
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attendance-${report.date}.pdf"`,
      },
    });
  }

  const transport = createTransport();
  if (!transport) {
    return NextResponse.json(
      {
        error:
          "ኢሜይል መላኪያ ገና አልተዘጋጀም። ፒዲኤፉን አውርደው መጠቀም ይቻላል። ለመላክ SMTP_USER እና SMTP_PASS በ .env.local ውስጥ ይሙሉ።",
      },
      { status: 503 },
    );
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: REPORT_EMAIL,
      subject: emailSubject(report),
      text: emailBody(report),
      attachments: [
        {
          filename: `attendance-${report.date}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "ሪፖርቱ አልተላከም። የኢሜይል መረጃውን ያረጋግጡ ወይም ፒዲኤፉን ያውርዱ።" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: `ሪፖርቱ ወደ ${REPORT_EMAIL} ተልኳል።` });
}

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE !== "false" : port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    socketTimeout: 20000,
  });
}
