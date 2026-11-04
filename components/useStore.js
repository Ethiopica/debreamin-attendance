"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mergeGroupState } from "../lib/access";
import { loadState, saveState } from "../lib/model";

export function useStore() {
  const [state, setState] = useState(null);
  const [storage, setStorage] = useState("local");
  const mode = useRef("local");
  const timer = useRef(null);
  const pending = useRef(null);

  const flush = useCallback(async (next) => {
    if (!next || mode.current !== "cloud") return;
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("save failed");
      setStorage("cloud");
    } catch {
      if (!pending.current) pending.current = next;
      setStorage("error");
    }
  }, []);

  const queue = useCallback(
    (next) => {
      pending.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const latest = pending.current;
        pending.current = null;
        flush(latest);
      }, 400);
    },
    [flush],
  );

  useEffect(() => {
    let ignore = false;
    (async () => {
      let status = 0;
      let remote = { configured: false };
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        status = response.status;
        remote = await response.json();
        if (!response.ok) remote = { ...remote, failed: true };
      } catch {
        remote = { configured: true, failed: true };
      }
      if (ignore) return;

      const local = loadState();
      if (status === 401) {
        mode.current = "local";
        setState(local);
        setStorage("local");
        return;
      }
      if (remote.partial && remote.state) {
        const groups = remote.groups || [];
        const remoteEmpty =
          remote.state.students.length === 0 && Object.keys(remote.state.records || {}).length === 0;
        const localHasAllowed =
          local.students.some((student) => groups.includes(student.groupId)) ||
          Object.values(local.records || {}).some((day) =>
            Object.keys(day?.groups || {}).some((groupId) => groups.includes(groupId)),
          );
        mode.current = "cloud";
        if (remoteEmpty && localHasAllowed) {
          saveState(local);
          setState(local);
          setStorage("cloud");
          queue(local);
          return;
        }
        const initial = mergeGroupState(local, remote.state, groups);
        saveState(initial);
        setState(initial);
        setStorage("cloud");
        return;
      }
      if (remote.configured && remote.state && !remote.failed) {
        mode.current = "cloud";
        const remoteEmpty =
          remote.state.students.length === 0 && Object.keys(remote.state.records || {}).length === 0;
        const localHasData = local.students.length > 0 || Object.keys(local.records || {}).length > 0;
        const initial = remoteEmpty && localHasData ? local : remote.state;
        saveState(initial);
        setState(initial);
        setStorage("cloud");
        if (initial !== remote.state) queue(initial);
        return;
      }

      mode.current = "local";
      setState(local);
      setStorage(remote.failed ? "error" : "local");
    })();

    return () => {
      ignore = true;
    };
  }, [queue]);

  useEffect(() => {
    const onHide = () => {
      const next = pending.current;
      if (!next || mode.current !== "cloud") return;
      clearTimeout(timer.current);
      pending.current = null;
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  const update = useCallback(
    (recipe) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = recipe(prev);
        if (next === prev) return next;
        saveState(next);
        if (mode.current === "cloud") queue(next);
        return next;
      });
    },
    [queue],
  );

  return { state, update, ready: Boolean(state), storage };
}
