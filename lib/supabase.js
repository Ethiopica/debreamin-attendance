import { createClient } from "@supabase/supabase-js";
import { coerceState } from "./model";

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadRemoteState() {
  const { data, error } = await client().rpc("load_attendance");
  if (error) throw error;
  return coerceState(data);
}

export async function saveRemoteState(state) {
  const { error } = await client().rpc("save_attendance", { payload: coerceState(state) });
  if (error) throw error;
}

export async function loadRemoteAuth() {
  const { data, error } = await client().rpc("load_auth");
  if (error) throw error;
  return data || { users: [], sessions: [] };
}

export async function saveRemoteAuth(payload) {
  const { error } = await client().rpc("save_auth", { payload });
  if (error) throw error;
}
