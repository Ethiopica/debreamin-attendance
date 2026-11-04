import { NextResponse } from "next/server";
import { allowedGroupIds, mergeGroupState, visibleState } from "../../../lib/access";
import { coerceState } from "../../../lib/model";
import { readSessionUser } from "../../../lib/session";
import { loadRemoteState, saveRemoteState, supabaseConfigured } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "መጀመሪያ ይግቡ።" }, { status: 401 });
  if (!supabaseConfigured()) {
    return NextResponse.json({ configured: false, role: user.role, groups: allowedGroupIds(user) });
  }
  try {
    const state = await loadRemoteState();
    const groups = allowedGroupIds(user);
    const visible = user.role === "admin" ? state : visibleState(state, groups);
    return NextResponse.json({
      configured: true,
      state: visible,
      partial: user.role !== "admin",
      role: user.role,
      groups,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ configured: true, error: "መዝገቡ አልተነበበም።" }, { status: 500 });
  }
}

export async function PUT(request) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "መጀመሪያ ይግቡ።" }, { status: 401 });
  if (!supabaseConfigured()) {
    return NextResponse.json({ configured: false, error: "የደመና መዝገብ ገና አልተዘጋጀም።" }, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "የመዝገቡ መረጃ አልተነበበም።" }, { status: 400 });
  }
  try {
    const incoming = coerceState(body);
    if (user.role === "admin") {
      await saveRemoteState(incoming);
    } else {
      const current = await loadRemoteState();
      await saveRemoteState(mergeGroupState(current, incoming, allowedGroupIds(user)));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "መዝገቡ አልተቀመጠም።" }, { status: 500 });
  }
}
