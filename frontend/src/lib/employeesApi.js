import { getToken, clearAuth } from "@/lib/auth";

const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

/**
 * Fetch employees with filter & sort
 *
 * params:
 * - q        : string (search)
 * - status   : "active" | "inactive" | "all"
 * - sort_by  : "name" | "employee_code" | "department" | "position" | "status" | "created_at"
 * - sort_dir : "asc" | "desc"
 */
export async function fetchEmployees(params = {}) {
  const token = getToken();

  // bersihin params kosong
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([_, v]) => v !== undefined && v !== null && v !== "" && v !== "all"
    )
  );

  const qs = new URLSearchParams(cleanParams).toString();

  const res = await fetch(`${BASE}/api/employees${qs ? `?${qs}` : ""}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // token invalid / expired
  if (res.status === 401) {
    clearAuth();
    throw new Error("Sesi habis. Silakan login ulang.");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message ?? `Gagal load employees (${res.status})`;
    throw new Error(msg);
  }

  // backend kamu return array langsung
  return Array.isArray(data) ? data : (data?.data ?? []);
}
