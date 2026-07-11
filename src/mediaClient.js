import { API_URL } from "./supabaseClient";

export async function uploadMedia(file) {
  if (!file) return "";
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_URL}/uploads`, { method: "POST", body: form });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "File upload failed");
  return body.url;
}
