import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { REPORT_EMAIL, STATUS_LABEL, summarize } from "./model";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 40;
const MARGIN_BOTTOM = 46;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const forest = rgb(0.106, 0.263, 0.196);
const cream = rgb(0.965, 0.937, 0.89);
const ink = rgb(0.137, 0.098, 0.059);
const muted = rgb(0.4, 0.345, 0.29);
const gold = rgb(0.71, 0.506, 0.184);
const white = rgb(1, 0.98, 0.96);
const rowAlt = rgb(0.965, 0.945, 0.91);
const line = rgb(0.86, 0.8, 0.72);
const presentColor = rgb(0.114, 0.42, 0.271);
const absentColor = rgb(0.616, 0.204, 0.157);
const permissionColor = rgb(0.553, 0.365, 0.063);

export async function buildAttendancePdf(report) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regularBytes = await readFile(path.join(process.cwd(), "public/fonts/NotoSansEthiopic-Regular.ttf"));
  const boldBytes = await readFile(path.join(process.cwd(), "public/fonts/NotoSansEthiopic-Bold.ttf"));
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const drawHeaderBand = () => {
    page.drawRectangle({ x: 0, y: PAGE_H - 108, width: PAGE_W, height: 108, color: forest });
    page.drawRectangle({ x: 0, y: PAGE_H - 112, width: PAGE_W, height: 4, color: gold });
    page.drawText(fit(bold, "የአቴንዳንስ ሪፖርት", 22, CONTENT_W), {
      x: MARGIN_X,
      y: PAGE_H - 52,
      size: 22,
      font: bold,
      color: cream,
    });
    page.drawText(fit(regular, report.dateLabel, 13, CONTENT_W), {
      x: MARGIN_X,
      y: PAGE_H - 78,
      size: 13,
      font: regular,
      color: cream,
    });
    y = PAGE_H - 136;
  };

  const newPage = (continued) => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 36;
    if (continued) {
      page.drawText(fit(bold, "የአቴንዳንስ ሪፖርት", 13, CONTENT_W), {
        x: MARGIN_X,
        y,
        size: 13,
        font: bold,
        color: forest,
      });
      y -= 22;
    }
  };

  const ensure = (height) => {
    if (y - height < MARGIN_BOTTOM) newPage(true);
  };

  const drawWrapped = (text, { font = regular, size = 11, color = ink, x = MARGIN_X, width = CONTENT_W, gap = 5 } = {}) => {
    const lines = wrapParagraphs(font, text, size, width);
    const lineHeight = size + gap;
    for (const row of lines) {
      ensure(lineHeight);
      if (row) page.drawText(row, { x, y: y - size, size, font, color });
      y -= lineHeight;
    }
    return lines.length * lineHeight;
  };

  drawHeaderBand();

  if (report.teacherName) {
    drawWrapped(`መምህር፦ ${report.teacherName}`, { font: bold, size: 12, gap: 4 });
  }
  if (report.generatedAt) {
    drawWrapped(`የተዘጋጀበት ጊዜ፦ ${report.generatedAt}`, { size: 10, color: muted, gap: 3 });
  }
  if (report.dayNote) {
    y -= 6;
    drawWrapped(`ማስታወሻ፦ ${report.dayNote}`, { size: 11 });
  }
  y -= 8;

  report.groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) y -= 16;
    ensure(92);
    page.drawText(fit(bold, group.name, 16, CONTENT_W), {
      x: MARGIN_X,
      y: y - 16,
      size: 16,
      font: bold,
      color: forest,
    });
    y -= 26;
    if (group.note) drawWrapped(`ማስታወሻ፦ ${group.note}`, { size: 10, color: muted, gap: 3 });
    drawTable(group);
    y -= 8;
    const counts = summarize(group.students);
    drawWrapped(
      `ጠቅላላ ${counts.total}   |   ተገኝተዋል ${counts.present}   |   ቀርተዋል ${counts.absent}   |   ፈቃድ ጠይቀዋል ${counts.permission}`,
      { font: bold, size: 11, color: forest, gap: 4 },
    );
  });

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    const label = `ገጽ ${index + 1} ከ ${pages.length}`;
    item.drawText(label, { x: MARGIN_X, y: 24, size: 9, font: regular, color: muted });
    const recipient = `ለ ${REPORT_EMAIL}`;
    const recipientWidth = regular.widthOfTextAtSize(recipient, 9);
    item.drawText(recipient, {
      x: PAGE_W - MARGIN_X - recipientWidth,
      y: 24,
      size: 9,
      font: regular,
      color: muted,
    });
  });

  try {
    pdf.setTitle("የአቴንዳንስ ሪፖርት");
    pdf.setAuthor(report.teacherName || "አቴንዳንስ");
    pdf.setSubject(report.dateLabel || "Attendance");
    pdf.setCreator("አቴንዳንስ");
  } catch {
    pdf.setTitle("Attendance report");
  }

  return Buffer.from(await pdf.save());

  function drawTable(group) {
    const columns = { num: 36, name: 292, status: CONTENT_W - 36 - 292 };
    const headerHeight = 26;
    ensure(headerHeight + 24);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - headerHeight,
      width: CONTENT_W,
      height: headerHeight,
      color: forest,
    });
    const headerY = y - 17;
    page.drawText("ቁጥር", { x: MARGIN_X + 8, y: headerY, size: 10, font: bold, color: cream });
    page.drawText("የተማሪ ስም", { x: MARGIN_X + columns.num + 8, y: headerY, size: 10, font: bold, color: cream });
    page.drawText("ሁኔታ", { x: MARGIN_X + columns.num + columns.name + 8, y: headerY, size: 10, font: bold, color: cream });
    y -= headerHeight;

    group.students.forEach((student, index) => {
      const nameLines = wrap(regular, student.name, 11, columns.name - 16);
      const shown = nameLines.length ? nameLines : ["-"];
      const rowHeight = Math.max(shown.length, 1) * 16 + 10;
      ensure(rowHeight);
      page.drawRectangle({
        x: MARGIN_X,
        y: y - rowHeight,
        width: CONTENT_W,
        height: rowHeight,
        color: index % 2 === 0 ? white : rowAlt,
        borderColor: line,
        borderWidth: 0.4,
      });
      page.drawText(String(index + 1), {
        x: MARGIN_X + 8,
        y: y - 18,
        size: 11,
        font: regular,
        color: ink,
      });
      shown.forEach((row, lineIndex) => {
        page.drawText(row, {
          x: MARGIN_X + columns.num + 8,
          y: y - 18 - lineIndex * 16,
          size: 11,
          font: regular,
          color: ink,
        });
      });
      const status = STATUS_LABEL[student.status] || "—";
      page.drawText(fit(bold, status, 11, columns.status - 16), {
        x: MARGIN_X + columns.num + columns.name + 8,
        y: y - 18,
        size: 11,
        font: bold,
        color: statusColor(student.status),
      });
      y -= rowHeight;
    });
  }
}

function statusColor(status) {
  if (status === "present") return presentColor;
  if (status === "absent") return absentColor;
  if (status === "permission") return permissionColor;
  return ink;
}

function fit(font, text, size, maxWidth) {
  const clean = safe(font, text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let out = clean;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

function wrapParagraphs(font, text, size, maxWidth) {
  const parts = safe(font, text).split("\n");
  const lines = [];
  parts.forEach((part) => {
    const wrapped = wrap(font, part, size, maxWidth);
    lines.push(...(wrapped.length ? wrapped : [""]));
  });
  return lines;
}

function wrap(font, text, size, maxWidth) {
  const clean = safe(font, text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      current = trial;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const character of word) {
      const next = chunk + character;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) chunk = next;
      else {
        if (chunk) lines.push(chunk);
        chunk = character;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines;
}

const presentFill = rgb(0.184, 0.62, 0.384);
const absentFill = rgb(0.839, 0.271, 0.239);
const permissionFill = rgb(0.494, 0.784, 0.922);
const presentInk = rgb(1, 1, 1);
const absentInk = rgb(1, 1, 1);
const permissionInk = rgb(0.08, 0.24, 0.36);

export async function buildSummaryPdf(summary) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regularBytes = await readFile(path.join(process.cwd(), "public/fonts/NotoSansEthiopic-Regular.ttf"));
  const boldBytes = await readFile(path.join(process.cwd(), "public/fonts/NotoSansEthiopic-Bold.ttf"));
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const marginX = 24;
  const marginBottom = 30;
  const numW = 22;
  const nameW = 136;
  const countW = 20;
  const cell = 28;
  const rowH = 18;
  const headH = 40;
  const titleH = 92;
  const usable = pageWidth - marginX * 2 - numW - nameW - countW * 3;
  const datesPerPage = Math.max(1, Math.floor(usable / cell));
  const rowsPerPage = Math.max(1, Math.floor((pageHeight - titleH - marginBottom - headH) / rowH));
  const dateChunks = chunk(summary.dates, datesPerPage);
  const studentChunks = chunk(summary.students, rowsPerPage);
  if (!dateChunks.length) dateChunks.push([]);
  if (!studentChunks.length) studentChunks.push([]);

  const dayWord = summary.day === "friday" ? "አርብ" : "ቅዳሜ";
  const range =
    summary.dates.length > 0
      ? `${summary.dates[0].day} ${summary.dates[0].month} ${summary.dates[0].year} - ${summary.dates.at(-1).day} ${summary.dates.at(-1).month} ${summary.dates.at(-1).year}`
      : "ገና የተመዘገበ ቀን የለም";

  dateChunks.forEach((dates, dateIndex) => {
    const dateOffset = dateIndex * datesPerPage;
    studentChunks.forEach((students, studentIndex) => {
      const page = pdf.addPage([pageWidth, pageHeight]);
      let y = pageHeight - 28;
      page.drawText(fit(bold, "የቡድን ማጠቃለያ", 16, pageWidth - marginX * 2), {
        x: marginX,
        y: y - 16,
        size: 16,
        font: bold,
        color: forest,
      });
      y -= 22;
      page.drawText(fit(bold, summary.groupName, 13, pageWidth - marginX * 2), {
        x: marginX,
        y: y - 13,
        size: 13,
        font: bold,
        color: ink,
      });
      y -= 18;
      const meta = `${summary.dates.length} ${dayWord}   |   ${range}`;
      page.drawText(fit(regular, summary.teacherName ? `መምህር፦ ${summary.teacherName}   |   ${meta}` : meta, 9, pageWidth - marginX * 2), {
        x: marginX,
        y: y - 9,
        size: 9,
        font: regular,
        color: muted,
      });
      y -= 16;
      drawLegend(page, marginX, y);
      y -= 16;

      const tableW = numW + nameW + countW * 3 + dates.length * cell;
      page.drawRectangle({ x: marginX, y: y - headH, width: tableW, height: headH, color: forest });
      let x = marginX;
      drawCenter(page, bold, "ቁ", x, y - 24, numW, 8, cream);
      page.drawText("ስም", { x: x + numW + 6, y: y - 24, size: 9, font: bold, color: cream });
      x += numW + nameW;
      ["ተ", "ቀ", "ፈ"].forEach((label) => {
        drawCenter(page, bold, label, x, y - 24, countW, 9, cream);
        x += countW;
      });
      dates.forEach((date) => {
        drawCenter(page, bold, date.day, x, y - 15, cell, 9, cream);
        drawCenter(page, regular, date.month, x, y - 29, cell, 8, cream);
        x += cell;
      });
      y -= headH;

      const start = studentIndex * rowsPerPage;
      students.forEach((student, index) => {
        const bg = index % 2 === 0 ? white : rowAlt;
        let col = marginX;
        page.drawRectangle({
          x: col,
          y: y - rowH,
          width: numW + nameW,
          height: rowH,
          color: bg,
          borderColor: line,
          borderWidth: 0.3,
        });
        drawCenter(page, regular, String(start + index + 1), col, y - 13, numW, 8, ink);
        page.drawText(fit(regular, student.name, 8, nameW - 10), {
          x: col + numW + 4,
          y: y - 13,
          size: 8,
          font: regular,
          color: ink,
        });
        col += numW + nameW;
        [
          [student.present, presentColor],
          [student.absent, absentColor],
          [student.permission, rgb(0.12, 0.45, 0.62)],
        ].forEach(([count, color]) => {
          page.drawRectangle({
            x: col,
            y: y - rowH,
            width: countW,
            height: rowH,
            color: bg,
            borderColor: line,
            borderWidth: 0.3,
          });
          drawCenter(page, bold, String(count), col, y - 13, countW, 8, count ? color : muted);
          col += countW;
        });
        student.marks.slice(dateOffset, dateOffset + dates.length).forEach((status) => {
          const paint = cellPaint(status);
          page.drawRectangle({
            x: col,
            y: y - rowH,
            width: cell,
            height: rowH,
            color: paint.fill || bg,
            borderColor: line,
            borderWidth: 0.3,
          });
          if (paint.label) drawCenter(page, bold, paint.label, col, y - 13, cell, 8, paint.ink);
          col += cell;
        });
        y -= rowH;
      });
    });
  });

  const pages = pdf.getPages();
  pages.forEach((item, index) => {
    const label = `ገጽ ${index + 1} ከ ${pages.length}`;
    item.drawText(label, { x: marginX, y: 16, size: 8, font: regular, color: muted });
    const note = "አረንጓዴ ተገኝተዋል  |  ቀይ ቀርተዋል  |  ሰማያዊ ፈቃድ ጠይቀዋል";
    const width = regular.widthOfTextAtSize(note, 8);
    item.drawText(note, { x: pageWidth - marginX - width, y: 16, size: 8, font: regular, color: muted });
  });

  try {
    pdf.setTitle("የቡድን ማጠቃለያ");
    pdf.setAuthor(summary.teacherName || "አቴንዳንስ");
    pdf.setSubject(summary.groupName);
    pdf.setCreator("አቴንዳንስ");
  } catch {
    pdf.setTitle("Attendance summary");
  }

  return Buffer.from(await pdf.save());

  function drawLegend(page, x, y) {
    const items = [
      [presentFill, "ተገኝተዋል"],
      [absentFill, "ቀርተዋል"],
      [permissionFill, "ፈቃድ ጠይቀዋል"],
    ];
    let cursor = x;
    items.forEach(([color, label]) => {
      page.drawRectangle({ x: cursor, y: y - 10, width: 10, height: 10, color });
      page.drawText(label, { x: cursor + 14, y: y - 9, size: 9, font: regular, color: ink });
      cursor += 14 + regular.widthOfTextAtSize(label, 9) + 16;
    });
  }
}

function cellPaint(status) {
  if (status === "present") return { fill: presentFill, ink: presentInk, label: "ተ" };
  if (status === "absent") return { fill: absentFill, ink: absentInk, label: "ቀ" };
  if (status === "permission") return { fill: permissionFill, ink: permissionInk, label: "ፈ" };
  return { fill: null, ink, label: "" };
}

function drawCenter(page, font, text, x, y, width, size, color) {
  const clean = safe(font, text);
  const textWidth = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, { x: x + Math.max(0, (width - textWidth) / 2), y, size, font, color });
}

function chunk(list, size) {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

function safe(font, text) {
  let out = "";
  for (const character of String(text || "")) {
    if (character === "\n" || character === "\t" || character === " ") {
      out += character === "\t" ? " " : character;
      continue;
    }
    try {
      font.widthOfTextAtSize(character, 12);
      out += character;
    } catch {
      out += "?";
    }
  }
  return out;
}
