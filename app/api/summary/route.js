import { NextResponse } from "next/server";
import { buildSummaryPdf } from "../../../lib/pdf";
import { formatAmharicStamp, normalizeSummary, validateSummary } from "../../../lib/model";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "የማጠቃለያው መረጃ አልተነበበም።" }, { status: 400 });
  }

  const summary = normalizeSummary(body);
  if (!summary.generatedAt) summary.generatedAt = formatAmharicStamp(new Date());
  const problem = validateSummary(summary);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  let pdf;
  try {
    pdf = await buildSummaryPdf(summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "የማጠቃለያው ፒዲኤፍ አልተዘጋጀም።" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="summary-${summary.groupId}.pdf"`,
    },
  });
}
