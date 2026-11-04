import { NextResponse } from "next/server";
import { changeOwnPassword } from "../../../../lib/auth-store";
import { readSessionUser } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "መጀመሪያ ይግቡ።" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "መረጃው አልተነበበም።" }, { status: 400 });
  }

  const currentPassword = String(body?.currentPassword || "");
  const nextPassword = String(body?.nextPassword || "");
  const confirmPassword = String(body?.confirmPassword || "");
  if (nextPassword.length < 8 || nextPassword.length > 80) {
    return NextResponse.json({ error: "አዲሱ የይለፍ ቃል ቢያንስ 8 ፊደል ይሁን።" }, { status: 400 });
  }
  if (nextPassword !== confirmPassword) {
    return NextResponse.json({ error: "አዲሱ የይለፍ ቃል ሁለቱም ጊዜ አንድ አይነት ይሁን።" }, { status: 400 });
  }

  try {
    const changed = await changeOwnPassword(user.id, currentPassword, nextPassword);
    if (changed.error) return NextResponse.json({ error: changed.error }, { status: 400 });
    return NextResponse.json({ user: changed.user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "የይለፍ ቃሉ አልተቀየረም።" }, { status: 500 });
  }
}
