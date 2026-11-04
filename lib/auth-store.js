import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_GROUPS } from "./model";
import { hashPassword, verifyPassword } from "./passwords";
import { loadRemoteAuth, saveRemoteAuth, supabaseConfigured } from "./supabase";

export const ADMIN_EMAIL = "eliobais@gmail.com";
const FILE_PATH = path.join(process.cwd(), "data", "auth.json");
const SESSION_MS = 1000 * 60 * 60 * 24 * 30;

let chain = Promise.resolve();
let warnedMissingAuthRpc = false;

function warnAuthRpc(error) {
  if (error?.code === "PGRST202") {
    if (!warnedMissingAuthRpc) {
      warnedMissingAuthRpc = true;
      console.warn("የመግቢያ መዝገቡ በደመናው ላይ ገና የለም። በዚህ መሳሪያ ላይ ይቆያል። supabase/schema.sql ን ያስኪዱ።");
    }
    return;
  }
  console.error(error);
}

function emptyStore() {
  return { users: [], sessions: [] };
}

function normalizeStore(value) {
  const users = Array.isArray(value?.users)
    ? value.users
        .filter((user) => user && typeof user.email === "string" && typeof user.id === "string")
        .map((user) => ({
          id: user.id,
          email: user.email.trim().toLowerCase(),
          name: String(user.name || "").slice(0, 80),
          role: user.role === "admin" ? "admin" : "teacher",
          passwordHash: typeof user.passwordHash === "string" ? user.passwordHash : "",
          mustChangePassword: user.role !== "admin" && user.mustChangePassword !== false,
          groups: Array.isArray(user.groups)
            ? DEFAULT_GROUPS.map((group) => group.id).filter((id) => user.groups.includes(id))
            : [],
        }))
    : [];
  const sessions = Array.isArray(value?.sessions)
    ? value.sessions.filter(
        (session) => session && typeof session.tokenHash === "string" && typeof session.userId === "string",
      )
    : [];
  return { users, sessions };
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    groups: user.role === "admin" ? DEFAULT_GROUPS.map((group) => group.id) : user.groups,
    mustChangePassword: user.role === "teacher" && user.mustChangePassword !== false,
  };
}

async function readFileStore() {
  try {
    return normalizeStore(JSON.parse(await readFile(FILE_PATH, "utf8")));
  } catch {
    return emptyStore();
  }
}

async function writeFileStore(store) {
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  const temporary = `${FILE_PATH}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(store));
  await rename(temporary, FILE_PATH);
}

async function readStore() {
  if (supabaseConfigured()) {
    try {
      const remote = normalizeStore(await loadRemoteAuth());
      if (remote.users.length > 0) return remote;
    } catch (error) {
      warnAuthRpc(error);
    }
  }
  return readFileStore();
}

async function writeStore(store) {
  const clean = normalizeStore(store);
  let fileSaved = false;
  let remoteSaved = false;
  let fileError = null;
  try {
    await writeFileStore(clean);
    fileSaved = true;
  } catch (error) {
    fileError = error;
  }
  if (supabaseConfigured()) {
    try {
      await saveRemoteAuth(clean);
      remoteSaved = true;
    } catch (error) {
      warnAuthRpc(error);
    }
  }
  // The deployed server cannot write data/auth.json. A cloud save is enough there.
  if (!fileSaved && !remoteSaved) throw fileError || new Error("የመግቢያ መዝገቡ አልተቀመጠም።");
  if (!fileSaved) console.error(fileError);
  return clean;
}

function withStore(mutator) {
  const run = chain.then(async () => {
    const store = await readStore();
    const now = Date.now();
    store.sessions = store.sessions.filter((session) => Number(session.expires) > now);
    const result = await mutator(store);
    if (result?.save) await writeStore(store);
    return result?.value;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function needsAdminSetup(store) {
  const admin = store.users.find((user) => user.email === ADMIN_EMAIL && user.role === "admin");
  return !admin?.passwordHash;
}

export async function authStatus() {
  return withStore(async (store) => ({ value: { needsSetup: needsAdminSetup(store) } }));
}

export async function setupAdmin(password) {
  return withStore(async (store) => {
    if (!needsAdminSetup(store)) return { value: { error: "የአስተዳዳሪው የይለፍ ቃል አስቀድሞ ተቀምጧል።" } };
    const admin = store.users.find((user) => user.email === ADMIN_EMAIL);
    const passwordHash = await hashPassword(password);
    if (admin) {
      admin.role = "admin";
      admin.passwordHash = passwordHash;
      admin.groups = DEFAULT_GROUPS.map((group) => group.id);
      if (!admin.name) admin.name = "አስተዳዳሪ";
    } else {
      store.users.push({
        id: randomBytes(16).toString("hex"),
        email: ADMIN_EMAIL,
        name: "አስተዳዳሪ",
        role: "admin",
        passwordHash,
        groups: DEFAULT_GROUPS.map((group) => group.id),
      });
    }
    return { save: true, value: { user: publicUser(store.users.find((user) => user.email === ADMIN_EMAIL)) } };
  });
}

export async function loginUser(email, password) {
  return withStore(async (store) => {
    const user = store.users.find((item) => item.email === email);
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return { value: { error: "ኢሜይሉ ወይም የይለፍ ቃሉ ትክክል አይደለም።" } };
    }
    const token = randomBytes(32).toString("hex");
    store.sessions.push({
      tokenHash: tokenHash(token),
      userId: user.id,
      expires: Date.now() + SESSION_MS,
    });
    return { save: true, value: { token, user: publicUser(user) } };
  });
}

export async function userFromToken(token) {
  if (!token) return null;
  return withStore(async (store) => {
    const session = store.sessions.find((item) => item.tokenHash === tokenHash(token));
    if (!session) return { value: null };
    const user = store.users.find((item) => item.id === session.userId);
    return { value: publicUser(user) };
  });
}

export async function logoutToken(token) {
  if (!token) return;
  await withStore(async (store) => {
    const hash = tokenHash(token);
    const before = store.sessions.length;
    store.sessions = store.sessions.filter((session) => session.tokenHash !== hash);
    return { save: store.sessions.length !== before, value: null };
  });
}

export async function listUsers() {
  return withStore(async (store) => ({
    value: store.users.map(publicUser),
  }));
}

export async function createTeacher({ name, email, password, groups }) {
  return withStore(async (store) => {
    if (email === ADMIN_EMAIL) return { value: { error: "ይህ ኢሜይል የአስተዳዳሪው ነው።" } };
    if (store.users.some((user) => user.email === email)) return { value: { error: "ይህ ኢሜይል አስቀድሞ ተመዝግቧል።" } };
    const user = {
      id: randomBytes(16).toString("hex"),
      email,
      name,
      role: "teacher",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      groups,
    };
    store.users.push(user);
    return { save: true, value: { user: publicUser(user) } };
  });
}

export async function updateUser(id, { name, password, groups }) {
  return withStore(async (store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) return { value: { error: "ተጠቃሚው አልተገኘም።" } };
    if (typeof name === "string" && name.trim()) user.name = name.trim().slice(0, 80);
    if (user.role !== "admin" && Array.isArray(groups)) {
      if (!groups.length) return { value: { error: "ቢያንስ አንድ ቡድን ይምረጡ።" } };
      user.groups = groups;
    }
    if (password) {
      user.passwordHash = await hashPassword(password);
      if (user.role === "teacher") user.mustChangePassword = true;
    }
    return { save: true, value: { user: publicUser(user) } };
  });
}

export async function changeOwnPassword(userId, currentPassword, nextPassword) {
  return withStore(async (store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user?.passwordHash) return { value: { error: "ተጠቃሚው አልተገኘም።" } };
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return { value: { error: "የአሁኑ የይለፍ ቃል ትክክል አይደለም።" } };
    }
    if (currentPassword === nextPassword) {
      return { value: { error: "አዲሱ የይለፍ ቃል ከአሁኑ የተለየ ይሁን።" } };
    }
    user.passwordHash = await hashPassword(nextPassword);
    user.mustChangePassword = false;
    return { save: true, value: { user: publicUser(user) } };
  });
}

export async function deleteUser(id) {
  return withStore(async (store) => {
    const user = store.users.find((item) => item.id === id);
    if (!user) return { value: { error: "ተጠቃሚው አልተገኘም።" } };
    if (user.role === "admin") return { value: { error: "አስተዳዳሪውን ማስወገድ አይቻልም።" } };
    store.users = store.users.filter((item) => item.id !== id);
    store.sessions = store.sessions.filter((session) => session.userId !== id);
    return { save: true, value: { ok: true } };
  });
}
