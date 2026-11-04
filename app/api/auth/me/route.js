import { NextResponse } from "next/server";
import { authStatus } from "../../../../lib/auth-store";
import { readSessionUser } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [user, status] = await Promise.all([readSessionUser(), authStatus()]);
  return NextResponse.json({ user, needsSetup: status.needsSetup });
}
