export const SESSION_KEY = "activeSchoolSession";

export function saveSession(role) {
  localStorage.setItem(SESSION_KEY, role);
}

export function clearSession(role) {
  if (!role || localStorage.getItem(SESSION_KEY) === role) localStorage.removeItem(SESSION_KEY);
}

export function getSessionDestination() {
  const activeRole = localStorage.getItem(SESSION_KEY);
  const hasAdmin = Boolean(localStorage.getItem("schoolData") || localStorage.getItem("adminData"));
  const hasStudent = Boolean(localStorage.getItem("studentData"));

  if (activeRole === "admin" && hasAdmin) return "/AdminDashboard";
  if (activeRole === "student" && hasStudent) return "/StudentDashboard";
  if (hasAdmin) return "/AdminDashboard";
  if (hasStudent) return "/StudentDashboard";
  return null;
}
