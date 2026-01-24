import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { fetchEmployees } from "@/lib/employeesApi";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();

  if (s === "active") {
    return (
      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
        active
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
      {status || "-"}
    </Badge>
  );
}

function initials(name) {
  const s = String(name || "").trim();
  return s ? s[0].toUpperCase() : "N";
}

export default function EmployeesPage() {
  const nav = useNavigate();
  const user = getUser();
  const role = String(user?.role || "").toLowerCase();

  const isHCGA = role === "hcga";
  const canView = ["hcga", "fat", "director"].includes(role);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  // sort
  const [sortBy, setSortBy] = useState("name"); // atau "employee_code"
  const [sortDir, setSortDir] = useState("asc");

  async function load(override = {}) {
    setErr("");
    setLoading(true);
    try {
      const params = {
        q: override.q ?? q,
        status: override.status ?? status,
        sort_by: override.sortBy ?? sortBy,
        sort_dir: override.sortDir ?? sortDir,
      };

      const data = await fetchEmployees(params);
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal load employees");
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => {
    if (!canView) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto reload when filter/sort changes (debounce for search)
  useEffect(() => {
    if (!canView) return;

    const t = setTimeout(() => {
      load();
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, sortBy, sortDir]);

  const onDelete = async (id) => {
    if (!isHCGA) return;

    const ok = confirm("Yakin mau hapus employee ini?");
    if (!ok) return;

    try {
      await api(`/employees/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.message || "Gagal menghapus employee.");
    }
  };

  const summary = useMemo(() => {
    const total = rows.length;
    const active = rows.filter(
      (x) => String(x?.status).toLowerCase() === "active"
    ).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  const resetFilters = () => {
    setQ("");
    setStatus("all");
    setSortBy("name");
    setSortDir("asc");
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Forbidden: role kamu tidak boleh mengakses halaman Employees.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.10),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_48%)]" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700">
                Human Plus Institute
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              Employees
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Data pegawai untuk kebutuhan administrasi dan payroll.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Total: {loading ? "…" : summary.total}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active: {loading ? "…" : summary.active}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                Inactive: {loading ? "…" : summary.inactive}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => load()}
              disabled={loading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>

            {isHCGA && (
              <Button
                onClick={() => nav("/employees/new")}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                + Add Employee
              </Button>
            )}
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* FILTERS */}
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-7">
              <div className="text-sm font-semibold text-slate-800">
                Cari Employee
              </div>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Kode / nama / department / position..."
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Tips: ketik sebagian nama/kode, otomatis akan memfilter.
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-semibold text-slate-800">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
              >
                <option value="all">Semua</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-semibold text-slate-800">Urutkan</div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
              >
                <option value="name">Nama</option>
                <option value="employee_code">Kode Karyawan</option>
                <option value="department">Department</option>
                <option value="position">Position</option>
                <option value="status">Status</option>
                <option value="created_at">Terbaru</option>
              </select>

              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-2xl border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => setSortDir("asc")}
                  disabled={sortDir === "asc"}
                >
                  A–Z
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-2xl border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => setSortDir("desc")}
                  disabled={sortDir === "desc"}
                >
                  Z–A
                </Button>
              </div>
            </div>

            <div className="md:col-span-1 flex md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto rounded-2xl border-slate-200 bg-white hover:bg-slate-50"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Employee List
              </div>
              <div className="text-xs text-slate-500">
                Klik employee untuk melihat detail.
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${rows.length} data`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="px-8">
              <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-slate-700 pl-6 w-[340px]">
                      Employee
                    </TableHead>
                    <TableHead className="text-slate-700 w-[180px]">
                      Department
                    </TableHead>
                    <TableHead className="text-slate-700 w-[180px]">
                      Position
                    </TableHead>
                    <TableHead className="text-slate-700 w-[140px]">
                      Status
                    </TableHead>
                    <TableHead className="text-center text-slate-700 w-[320px] pr-6">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-slate-500"
                      >
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-slate-500"
                      >
                        Tidak ada employee yang sesuai.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading &&
                    rows.map((r, idx) => (
                      <TableRow
                        key={r.id}
                        className={[
                          "transition align-middle",
                          idx % 2 === 0 ? "bg-white/40" : "bg-white/20",
                          "hover:bg-slate-50/80",
                        ].join(" ")}
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-sm font-extrabold text-slate-700 shadow-sm shrink-0 cursor-pointer"
                              onClick={() => nav(`/employees/${r.id}`)}
                              title="Lihat detail"
                            >
                              {initials(r.name)}
                            </div>

                            <div className="min-w-0">
                              <div
                                className="min-w-0 cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onClick={() => nav(`/employees/${r.id}`)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ")
                                    nav(`/employees/${r.id}`);
                                }}
                              >
                                <div className="font-semibold text-slate-900 truncate hover:underline">
                                  {r.name || "-"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {r.employee_code || "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-700 py-4">
                          {r.department ?? "-"}
                        </TableCell>

                        <TableCell className="text-slate-700 py-4">
                          {r.position ?? "-"}
                        </TableCell>

                        <TableCell className="py-4">
                          <StatusBadge status={r.status} />
                        </TableCell>

                        <TableCell className="py-4 pr-6">
                          <div className="flex justify-center">
                            <div className="inline-flex flex-wrap items-center justify-center gap-2">
                              {isHCGA ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold hover:brightness-110"
                                    onClick={() =>
                                      nav(
                                        `/employees/${r.id}/salary-profile/new`
                                      )
                                    }
                                  >
                                    Set Salary
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                                    onClick={() => nav(`/employees/${r.id}/edit`)}
                                  >
                                    Edit
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-xl"
                                    onClick={() => onDelete(r.id)}
                                  >
                                    Delete
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                                  onClick={() => nav(`/employees/${r.id}`)}
                                >
                                  Detail
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Human Plus Institute</span>
            <span>Payroll Internal System</span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          * Set Salary / Add / Edit / Delete hanya untuk HCGA.
        </p>
      </div>
    </div>
  );
}
