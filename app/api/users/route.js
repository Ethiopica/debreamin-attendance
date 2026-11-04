import { NextResponse } from "next/server";
import { createTeacher, deleteUser, listUsers, updateUser } from "../../../lib/auth-store";
import { allowedGroupIds } from "../../../lib/access";
import { DEFAULT_GROUPS } from "../../../lib/model";
import { readSessionUser } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

function cleanGroups(value) {
  return DEFAULT_GROUPS.map((group) => group.id).filter((id) => Array.isArray(value) && value.includes(id));
}

async function requireAdmin() {
  const user = await readSessionUser();
  if (!user) return { error: NextResponse.json({ error: "መጀመሪያ ይግቡ።" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "ይህ ገጽ ለአስተዳዳሪው ብቻ ነው።" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const users = await listUsers();
  return NextResponse.json({ users, groups: allowedGroupIds(auth.user) });
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "መረጃው አልተነበበም።" }, { status: 400 });
  }
  const email = cleanEmail(body?.email);
  const name = String(body?.name || "").trim().slice(0, 80);
  const password = String(body?.password || "");
  const groups = cleanGroups(body?.groups);
  if (!name) return NextResponse.json({ error: "የመምህሩ ስም ያስፈልጋል።" }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "ኢሜይሉ ትክክል አይደለም።" }, { status: 400 });
  if (password.length < 8 || password.length > 80) {
    return NextResponse.json({ error: "የይለፍ ቃሉ ቢያንስ 8 ፊደል ይሁን።" }, { status: 400 });
  }
  if (!groups.length) return NextResponse.json({ error: "ቢያንስ አንድ ቡድን ይምረጡ።" }, { status: 400 });
  const created = await createTeacher({ name, email, password, groups });
  if (created.error) return NextResponse.json({ error: created.error }, { status: 400 });
  return NextResponse.json({ user: created.user });
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "መረጃው አልተነበበም።" }, { status: 400 });
  }
  const id = String(body?.id || "");
  const name = String(body?.name || "").trim().slice(0, 80);
  const password = String(body?.password || "");
  const groups = cleanGroups(body?.groups);
  if (!id) return NextResponse.json({ error: "ተጠቃሚው አልተገኘም።" }, { status: 400 });
  if (password && (password.length < 8 || password.length > 80)) {
    return NextResponse.json({ error: "የይለፍ ቃሉ ቢያንስ 8 ፊደል ይሁን።" }, { status: 400 });
  }
  const updated = await updateUser(id, {
    name,
    password,
    groups: Array.isArray(body?.groups) ? groups : undefined,
  });
  if (updated.error) return NextResponse.json({ error: updated.error }, { status: 400 });
  return NextResponse.json({ user: updated.user });
}

export async function DELETE(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "መረጃው አልተነበበም።" }, { status: 400 });
  }
  const removed = await deleteUser(String(body?.id || ""));
  if (removed.error) return NextResponse.json({ error: removed.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
