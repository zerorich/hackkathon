// Teacher accounts use a short handle in the UI and a stable namespaced
// identifier over the API. Keep that transformation in one place so login,
// registration, and future account recovery all agree on the same value.
const TEACHER_PREFIX = "teacher@";

export function buildTeacherIdentifier(handle) {
  const slug = handle.trim().toLowerCase().replace(/\s+/g, "-");
  return `${TEACHER_PREFIX}${slug}`;
}

export function isTeacherIdentifier(identifier) {
  return identifier.startsWith(TEACHER_PREFIX);
}

export function teacherHandle(identifier) {
  return identifier.startsWith(TEACHER_PREFIX) ? identifier.slice(TEACHER_PREFIX.length) : identifier;
}
