import { getToken, clearAuth } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders(json = false) {
  const token = getToken();
  if (!token || token === "undefined" || token === "null") {
    throw new Error("Token login tidak ditemukan. Silakan login ulang.");
  }

  const h = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function handle401() {
  // kalau token invalid / expired
  clearAuth?.();
  const err = new Error("Sesi habis. Silakan login ulang.");
  err.code = 401;
  throw err;
}

function makeErr(message, code, payload) {
  const err = new Error(message);
  err.code = code;
  err.payload = payload;
  return err;
}

/** GET /api/me (auth:sanctum) */
export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: authHeaders(false),
  });

  if (res.status === 401) handle401();

  const data = await readJson(res);
  if (!res.ok) {
    throw makeErr(data?.message || `Gagal memuat akun (${res.status})`, res.status, data);
  }

  return data; // {id,name,email,role,employee_id}
}

/** GET /api/me/employee (auth:sanctum) */
export async function fetchMeEmployee() {
  const res = await fetch(`${API_BASE}/api/me/employee`, {
    headers: authHeaders(false),
  });

  if (res.status === 401) handle401();

  const data = await readJson(res);

  // Khusus: belum terhubung ke employee / employee tidak ditemukan
  if (res.status === 404) {
    throw makeErr(
      data?.message || "Akun ini belum terhubung ke data employee.",
      404,
      data
    );
  }

  if (!res.ok) {
    throw makeErr(data?.message || `Gagal memuat profil (${res.status})`, res.status, data);
  }

  return data; // employee object
}

/**
 * PUT /api/me/employee (auth:sanctum)
 * NOTE: Route kamu sekarang PUT, jadi kita ikutin.
 */
export async function updateMeEmployee(payload) {
  const res = await fetch(`${API_BASE}/api/me/employee`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(payload ?? {}),
  });

  if (res.status === 401) handle401();

  const data = await readJson(res);
  if (!res.ok) {
    throw makeErr(data?.message || `Gagal update profil (${res.status})`, res.status, data);
  }

  return data; // {message, data: employee fresh()}
}
