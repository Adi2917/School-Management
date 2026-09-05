export const SESSION_KEY = "activeSchoolSession";
export const SESSION_EXPIRES_KEY = "activeSchoolSessionExpiresAt";
export const SESSION_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function removeStoredIdentity() {
  localStorage.removeItem("adminData");
  localStorage.removeItem("schoolData");
  localStorage.removeItem("studentData");
  localStorage.removeItem("selectedStudent");
}

export function saveSession(role) {
  localStorage.setItem(SESSION_KEY, role);
  localStorage.setItem(SESSION_EXPIRES_KEY, String(Date.now() + SESSION_TTL_MS));
}

export function clearSession(role) {
  if (!role || localStorage.getItem(SESSION_KEY) === role) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);
  }
  localStorage.removeItem("connectYourSchoolToken");
}

export function clearExpiredSession() {
  clearSession();
  removeStoredIdentity();
}

export function getSessionExpiresAt() {
  const activeRole = localStorage.getItem(SESSION_KEY);
  const hasToken = Boolean(localStorage.getItem("connectYourSchoolToken"));
  if (!activeRole || !hasToken) return null;

  const savedExpiry = Number(localStorage.getItem(SESSION_EXPIRES_KEY));
  if (Number.isFinite(savedExpiry) && savedExpiry > 0) return savedExpiry;

  // Existing logged-in users receive one normal three-day session after this update.
  const migratedExpiry = Date.now() + SESSION_TTL_MS;
  localStorage.setItem(SESSION_EXPIRES_KEY, String(migratedExpiry));
  return migratedExpiry;
}

export function getSessionDestination() {
  const activeRole = localStorage.getItem(SESSION_KEY);
  const hasToken = Boolean(localStorage.getItem("connectYourSchoolToken"));
  const hasAdmin = Boolean(localStorage.getItem("schoolData") || localStorage.getItem("adminData"));
  const hasStudent = Boolean(localStorage.getItem("studentData"));
  const expiresAt = getSessionExpiresAt();

  if (activeRole && (!expiresAt || expiresAt <= Date.now())) {
    clearExpiredSession();
    return null;
  }

  if (hasToken && activeRole === "admin" && hasAdmin) return "/AdminDashboard";
  if (hasToken && activeRole === "student" && hasStudent) return "/StudentDashboard";
  return null;
}
