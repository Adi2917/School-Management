export const SESSION_KEY = "activeSchoolSession";

export function saveSession(role) {
  localStorage.setItem(SESSION_KEY, role);
}

export function clearSession(role) {
  if (!role || localStorage.getItem(SESSION_KEY) === role) localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("connectYourSchoolToken");
}

export function getSessionDestination() {
  const activeRole = localStorage.getItem(SESSION_KEY);
  const hasToken = Boolean(localStorage.getItem("connectYourSchoolToken"));
  const hasAdmin = Boolean(localStorage.getItem("schoolData") || localStorage.getItem("adminData"));
  const hasStudent = Boolean(localStorage.getItem("studentData"));

  if (hasToken && activeRole === "admin" && hasAdmin) return "/AdminDashboard";
  if (hasToken && activeRole === "student" && hasStudent) return "/StudentDashboard";
  return null;
}
