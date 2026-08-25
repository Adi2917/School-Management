const DEFAULT_API_URL = import.meta.env.DEV ? "http://localhost:5000/api" : "/api";
const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
const TOKEN_KEY = "connectYourSchoolToken";

export const setApiToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};
export const getApiSubject = () => { try { const token=localStorage.getItem(TOKEN_KEY); return token ? JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).subject || "" : ""; } catch { return ""; } };

export async function authLogin(role, credentials) {
  const response = await fetch(`${API_URL}/auth/${role}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Invalid credentials");
  setApiToken(body.data?.token);
  return body.data?.user;
}

async function authAction(role, path, payload) {
  const response = await fetch(`${API_URL}/auth/${role}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body.data;
}
export const requestStudentPinReset = payload => authAction("student", "request-pin-reset", payload);
export const resetStudentPin = payload => authAction("student", "reset-pin", payload);
export const requestAdminPinReset = payload => authAction("admin", "request-pin-reset", payload);
export const resetAdminPin = payload => authAction("admin", "reset-pin", payload);
export async function getCollectionAnalytics(params = {}) {
  const query = new URLSearchParams(params); const token=localStorage.getItem(TOKEN_KEY);
  const response=await fetch(`${API_URL}/analytics/collections?${query}`,{headers:{...(token?{Authorization:`Bearer ${token}`}:{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||"Could not load collection analytics");return body.data;
}

class QueryBuilder {
  constructor(collection) { this.collection = collection; this.filters = []; this.action = "select"; this.payload = null; this.one = false; }
  select(fields = "*") { this.fields = fields; return this; }
  insert(value) { this.action = "insert"; this.payload = value; return this; }
  update(value) { this.action = "update"; this.payload = value; return this; }
  delete() { this.action = "delete"; return this; }
  eq(field, value) { const resolved = ["id","student_id"].includes(field) && (!value || value === "undefined") ? getApiSubject() : value; if (resolved !== undefined && resolved !== "undefined" && resolved !== "") this.filters.push([field, resolved]); return this; }
  order(field, options = {}) { this.sort = [field, options.ascending === false ? "desc" : "asc"]; return this; }
  single() { this.one = true; return this; }
  async execute() {
    try {
      const params = new URLSearchParams();
      this.filters.forEach(([key, value]) => params.append(key, value));
      if (this.sort) params.set("sort", `${this.sort[0]}:${this.sort[1]}`);
      const token = localStorage.getItem(TOKEN_KEY);
      const options = { headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
      if (this.action === "insert") { options.method = "POST"; options.body = JSON.stringify(this.payload); }
      if (this.action === "update") { options.method = "PATCH"; options.body = JSON.stringify(this.payload); }
      if (this.action === "delete") options.method = "DELETE";
      const response = await fetch(`${API_URL}/${this.collection}?${params}`, options);
      const raw = await response.text();
      let body;
      try { body = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`API unavailable (${response.status}). Please try again.`); }
      if (!response.ok) throw new Error(body.message || `Database request failed (${response.status})`);
      const data = this.one && Array.isArray(body.data) ? body.data[0] || null : body.data;
      return { data, error: null };
    } catch (error) { console.error("MongoDB API:", error.message); return { data: this.one ? null : [], error }; }
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
export const supabase = {
  from: (collection) => new QueryBuilder(collection),
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: () => {},
  storage: { from: () => ({
    async upload(path, file) { try { localStorage.setItem(`upload:${path}`, await fileToDataUrl(file)); return { error: null }; } catch (error) { return { error }; } },
    getPublicUrl(path) { return { data: { publicUrl: localStorage.getItem(`upload:${path}`) || "" } }; },
  }) },
};
export { API_URL };
