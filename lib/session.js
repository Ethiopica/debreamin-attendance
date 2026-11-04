import { cookies } from "next/headers";
import { userFromToken } from "./auth-store";

export const SESSION_COOKIE = "attendance_session";

export function sessionCookie(token) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export async function readSessionUser() {
  const jar = await cookies();
  return userFromToken(jar.get(SESSION_COOKIE)?.value || "");
}

export async function readSessionToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value || "";
}
