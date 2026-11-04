import { DEFAULT_GROUPS, coerceState } from "./model";

export function allowedGroupIds(user) {
  if (!user) return [];
  if (user.role === "admin") return DEFAULT_GROUPS.map((group) => group.id);
  return DEFAULT_GROUPS.map((group) => group.id).filter((id) => user.groups?.includes(id));
}

export function canUseGroup(user, groupId) {
  return allowedGroupIds(user).includes(groupId);
}

export function visibleState(state, groupIds) {
  const allow = new Set(groupIds);
  const next = coerceState(state);
  next.groups = next.groups.filter((group) => allow.has(group.id));
  next.students = next.students.filter((student) => allow.has(student.groupId));
  for (const day of Object.values(next.records || {})) {
    for (const id of Object.keys(day?.groups || {})) {
      if (!allow.has(id)) delete day.groups[id];
    }
  }
  return next;
}

export function mergeGroupState(base, incoming, groupIds) {
  const allow = new Set(groupIds.filter((id) => DEFAULT_GROUPS.some((group) => group.id === id)));
  const next = coerceState(base);
  const patch = coerceState(incoming);
  if (patch.teacherName) next.teacherName = patch.teacherName;
  if (patch.lastDate) next.lastDate = patch.lastDate;
  for (const group of patch.groups) {
    if (!allow.has(group.id)) continue;
    const target = next.groups.find((item) => item.id === group.id);
    if (target && group.name.trim()) target.name = group.name.trim();
  }
  next.students = [
    ...next.students.filter((student) => !allow.has(student.groupId)),
    ...patch.students.filter((student) => allow.has(student.groupId)),
  ];
  for (const [iso, day] of Object.entries(patch.records || {})) {
    if (!next.records[iso]) next.records[iso] = { note: "", groups: {} };
    if (!next.records[iso].groups) next.records[iso].groups = {};
    for (const id of allow) {
      if (day?.groups?.[id]) next.records[iso].groups[id] = day.groups[id];
    }
  }
  return coerceState(next);
}
