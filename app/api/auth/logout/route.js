import { NextResponse } from "next/server";
import { logoutToken } from "../../../../lib/auth-store";
import { SESSION_COOKIE, readSessionToken } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await logoutToken(await readSessionToken());
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
