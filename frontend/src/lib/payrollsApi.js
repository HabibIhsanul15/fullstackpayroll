import { getToken, clearAuth } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = getToken();
  if (!token) {
    const err = new Error("Token login tidak ditemukan. Silakan login ulang.");
    err.code = "NO_TOKEN";
    throw err;
  }

  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function handle401() {
  clearAuth?.();
  throw new Error("Sesi habis. Silakan login ulang.");
}

/**
 * Ambil list employee (lite) dengan filter status opsional
 * @param {string|null} status "active" | "inactive" | null
 */
export async function fetchEmployeesLite(status = null) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const res = await fetch(`${API_BASE}/api/employees${qs}`, {
    headers: { ...authHeaders() },
  });

  if (res.status === 401) handle401();

  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Gagal mengambil data employees (${res.status}).`);
  }

  // Normal: array
  if (Array.isArray(data)) return data;

  // fallback: kalau kebungkus
  return data?.data ?? data?.value ?? [];
}

export async function fetchCurrentSalaryProfile(employeeId, dateStr) {
  const url = new URL(`${API_BASE}/api/employees/${employeeId}/salary-profile`);
  if (dateStr) url.searchParams.set("date", dateStr);

  const res = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  });

  if (res.status === 401) handle401();

  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Gagal mengambil salary profile (${res.status}).`);
  }

  return data;
}

export async function createPayroll(payload) {
  const res = await fetch(`${API_BASE}/api/payrolls`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) handle401();

  const data = await readJson(res);

  if (!res.ok) {
    const msg =
      data?.message ||
      (data?.errors ? "Validasi gagal. Cek isian." : `Gagal membuat payroll (${res.status}).`);

    const err = new Error(msg);
    err.payload = data; // supaya bisa dipakai mapping errors di UI
    throw err;
  }

  return data;
}
