import { NextResponse } from "next/server";
import { coerceState } from "../../../lib/model";
import { loadRemoteState, saveRemoteState, supabaseConfigured } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ configured: false });
  }
  try {
    const state = await loadRemoteState();
    return NextResponse.json({ configured: true, state });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ configured: true, error: "መዝገቡ አልተነበበም።" }, { status: 500 });
  }
}

export async function PUT(request) {
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
    await saveRemoteState(coerceState(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "መዝገቡ አልተቀመጠም።" }, { status: 500 });
  }
}
