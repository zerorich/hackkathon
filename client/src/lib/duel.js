// /me/duels returns raw model enum values; /duels/:id and /duels/code/:code
// return values already mapped to the WAITING/ACTIVE vocabulary. Normalize both
// so the UI only ever has to deal with one vocabulary.
const RAW_TO_DISPLAY = {
  PENDING: "WAITING",
  ACCEPTED: "ACTIVE",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
};

export function normalizeDuelStatus(status) {
  return RAW_TO_DISPLAY[status] || status;
}

const LABELS = {
  WAITING: "Raqibni kutmoqda",
  ACTIVE: "Davom etmoqda",
  COMPLETED: "Yakunlangan",
  EXPIRED: "Muddati tugagan",
  CANCELLED: "Bekor qilingan",
};

export function duelStatusLabel(status) {
  return LABELS[normalizeDuelStatus(status)] || status;
}

const ATTEMPT_MAP_PREFIX = "maa_attempt_challenge:";
const DUEL_MAP_PREFIX = "maa_attempt_duel:";

export function cacheAttemptChallenge(attemptId, challenge) {
  try {
    sessionStorage.setItem(ATTEMPT_MAP_PREFIX + attemptId, JSON.stringify(challenge));
  } catch {
    /* sessionStorage unavailable — attempt page will show a resume error */
  }
}

export function getCachedAttemptChallenge(attemptId) {
  try {
    const raw = sessionStorage.getItem(ATTEMPT_MAP_PREFIX + attemptId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCachedAttemptChallenge(attemptId) {
  try {
    sessionStorage.removeItem(ATTEMPT_MAP_PREFIX + attemptId);
  } catch {
    /* ignore */
  }
}

export function linkAttemptToDuel(attemptId, duelId) {
  try {
    sessionStorage.setItem(DUEL_MAP_PREFIX + attemptId, duelId);
  } catch {
    /* ignore */
  }
}

export function getDuelForAttempt(attemptId) {
  try {
    return sessionStorage.getItem(DUEL_MAP_PREFIX + attemptId);
  } catch {
    return null;
  }
}
