import { getToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = getToken();
  if (!token) throw new Error("Token login tidak ditemukan. Silakan login ulang.");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function fetchEmployeesLite() {
  const res = await fetch(`${API_BASE}/api/employees`, {
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Gagal mengambil data employees.");
  return data;
}

export async function fetchCurrentSalaryProfile(employeeId, dateStr) {
  const url = new URL(`${API_BASE}/api/employees/${employeeId}/salary-profile`);
  if (dateStr) url.searchParams.set("date", dateStr);

  const res = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Gagal mengambil salary profile.");
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.message ||
      (data?.errors ? "Validasi gagal. Cek isian." : "Gagal membuat payroll.");
    const err = new Error(msg);
    err.payload = data;
    throw err;
  }
  return data;
}
