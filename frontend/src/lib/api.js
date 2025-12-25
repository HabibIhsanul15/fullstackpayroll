import { getToken, clearAuth } from "./auth";

const BASE_URL = "http://127.0.0.1:8000";
const API_PREFIX = "/api";

export async function api(path, { method = "GET", body } = {}) {
  // path boleh "payrolls" / "/payrolls" / "/api/payrolls" -> dibenerin otomatis
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!cleanPath.startsWith(API_PREFIX)) cleanPath = `${API_PREFIX}${cleanPath}`;

  const url = `${BASE_URL}${cleanPath}`;

  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token && token !== "undefined" && token !== "null") {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  // kalau 401: token invalid / gak dikirim / expired
  if (res.status === 401) {
    clearAuth(); // biar gak loop error terus
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.message) ? data.message : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    err.url = url;
    throw err;
  }

  return data;
}
