import { API_URL } from "./supabaseClient";

const compressImage = file => new Promise((resolve, reject) => {
  if (!file.type.startsWith("image/")) return resolve(file);
  const image = new Image(); const url = URL.createObjectURL(file);
  image.onload = async () => {
    try {
      let width = Math.min(image.width, 1080), height = Math.round(image.height * width / image.width), quality = .78, blob;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);
        blob = await new Promise(done => canvas.toBlob(done, "image/jpeg", quality));
        if (blob?.size <= 200 * 1024) break;
        width = Math.max(480, Math.round(width * .8)); height = Math.round(image.height * width / image.width); quality = Math.max(.35, quality - .1);
      }
      URL.revokeObjectURL(url); resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" }));
    } catch (error) { URL.revokeObjectURL(url); reject(error); }
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unsupported image")); };
  image.src = url;
});

export async function uploadMedia(file) {
  if (!file) return "";
  const optimized = await compressImage(file);
  const form = new FormData();
  form.append("file", optimized);
  const token = localStorage.getItem("connectYourSchoolToken");
  const response = await fetch(`${API_URL}/uploads`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "File upload failed");
  return body.url;
}
