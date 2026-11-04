import { NextResponse } from "next/server";
import { ADMIN_EMAIL, authStatus, loginUser, setupAdmin } from "../../../../lib/auth-store";
import { sessionCookie } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "መረጃው አልተነበበም።" }, { status: 400 });
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (password.length < 8 || password.length > 80) {
    return NextResponse.json({ error: "የይለፍ ቃሉ ቢያንስ 8 ፊደል ይሁን።" }, { status: 400 });
  }

  if (body?.setup) {
    if (email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "የአስተዳዳሪው ኢሜይል eliobais@gmail.com ነው።" }, { status: 400 });
    }
    const status = await authStatus();
    if (!status.needsSetup) {
      return NextResponse.json({ error: "የአስተዳዳሪው የይለፍ ቃል አስቀድሞ ተቀምጧል።" }, { status: 400 });
    }
    const created = await setupAdmin(password);
    if (created.error) return NextResponse.json({ error: created.error }, { status: 400 });
    const loggedIn = await loginUser(email, password);
    if (loggedIn.error || !loggedIn.token) {
      return NextResponse.json({ error: loggedIn.error || "መግባት አልተሳካም።" }, { status: 400 });
    }
    const response = NextResponse.json({ user: loggedIn.user });
    const cookie = sessionCookie(loggedIn.token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  }

  let loggedIn;
  try {
    loggedIn = await loginUser(email, password);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "መግባት አልተሳካም። እንደገና ይሞክሩ።" }, { status: 500 });
  }
  if (loggedIn.error || !loggedIn.token) {
    return NextResponse.json({ error: loggedIn.error || "መግባት አልተሳካም።" }, { status: 401 });
  }
  const response = NextResponse.json({ user: loggedIn.user });
  const cookie = sessionCookie(loggedIn.token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
