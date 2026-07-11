const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

class QueryBuilder {
  constructor(collection) { this.collection = collection; this.filters = []; this.action = "select"; this.payload = null; this.one = false; }
  select(fields = "*") { this.fields = fields; return this; }
  insert(value) { this.action = "insert"; this.payload = value; return this; }
  update(value) { this.action = "update"; this.payload = value; return this; }
  delete() { this.action = "delete"; return this; }
  eq(field, value) { this.filters.push([field, value]); return this; }
  order(field, options = {}) { this.sort = [field, options.ascending === false ? "desc" : "asc"]; return this; }
  single() { this.one = true; return this; }
  async execute() {
    try {
      const params = new URLSearchParams();
      this.filters.forEach(([key, value]) => params.append(key, value));
      if (this.sort) params.set("sort", `${this.sort[0]}:${this.sort[1]}`);
      const options = { headers: { "Content-Type": "application/json" } };
      if (this.action === "insert") { options.method = "POST"; options.body = JSON.stringify(this.payload); }
      if (this.action === "update") { options.method = "PATCH"; options.body = JSON.stringify(this.payload); }
      if (this.action === "delete") options.method = "DELETE";
      const response = await fetch(`${API_URL}/${this.collection}?${params}`, options);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Database request failed");
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
