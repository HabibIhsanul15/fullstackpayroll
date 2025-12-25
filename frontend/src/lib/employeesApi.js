import { getToken, clearAuth } from "@/lib/auth";

const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export async function fetchEmployees() {
  const token = getToken();

  const res = await fetch(`${BASE}/api/employees`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // kalau token invalid / expired
  if (res.status === 401) {
    clearAuth();
    throw new Error("Sesi habis. Silakan login ulang.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message ?? `Gagal load employees (${res.status})`;
    throw new Error(msg);
  }

  // normal: Laravel return array
  // antisipasi: kalau kebungkus (mis. PowerShell), ambil .value
  return Array.isArray(data) ? data : (data?.value ?? []);
}
