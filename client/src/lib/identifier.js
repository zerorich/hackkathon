// The backend auto-assigns TEACHER role only when the identifier starts with
// "teacher@" (see server/services/domain.py _get_or_create_user); every other
// identifier becomes a STUDENT. These helpers keep that real backend rule in
// one place instead of duplicating the "teacher@" prefix across screens.
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
