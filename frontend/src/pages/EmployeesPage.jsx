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
  const canManage = user?.role === "fat" || user?.role === "director";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // UI
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchEmployees();
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id) => {
    const ok = confirm("Yakin mau hapus employee ini?");
    if (!ok) return;

    try {
      await api(`/employees/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.message || "Gagal menghapus employee.");
    }
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const code = String(r?.employee_code ?? "").toLowerCase();
      const name = String(r?.name ?? "").toLowerCase();
      const dep = String(r?.department ?? "").toLowerCase();
      const pos = String(r?.position ?? "").toLowerCase();
      const st = String(r?.status ?? "").toLowerCase();

      const matchQ =
        !qq ||
        code.includes(qq) ||
        name.includes(qq) ||
        dep.includes(qq) ||
        pos.includes(qq);

      const matchStatus = status === "all" || st === status;

      return matchQ && matchStatus;
    });
  }, [rows, q, status]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter(
      (x) => String(x?.status).toLowerCase() === "active"
    ).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [filtered]);

  const resetFilters = () => {
    setQ("");
    setStatus("all");
  };

  return (
    <div className="relative">
      {/* bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.10),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_48%)]" />
      </div>

      <div className="space-y-6">
        {/* header */}
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
              Data pegawai untuk kebutuhan penggajian dan salary profile.
            </p>

            {/* chips */}
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
              onClick={load}
              disabled={loading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>

            {canManage && (
              <Button
                onClick={() => nav("/employees/new")}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                + Add Employee
              </Button>
            )}
          </div>
        </div>

        {/* error */}
        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
          </div>
        )}

        {/* filters */}
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-8">
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
            </div>

            <div className="md:col-span-3">
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

        {/* table */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Employee List
              </div>
              <div className="text-xs text-slate-500">
                Klik aksi untuk mengatur salary / edit / hapus employee.
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {loading ? "Memuat..." : `${filtered.length} data`}
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* padding kiri-kanan supaya tidak mepet card */}
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

                {!loading && filtered.length === 0 && (
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
                  filtered.map((r, idx) => (
                    <TableRow
                      key={r.id}
                      className={[
                        "transition align-middle",
                        idx % 2 === 0 ? "bg-white/40" : "bg-white/20",
                        "hover:bg-slate-50/80",
                      ].join(" ")}
                    >
                      {/* employee cell */}
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-sm font-extrabold text-slate-700 shadow-sm shrink-0">
                            {initials(r.name)}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {r.name || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {r.employee_code || "-"}
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

                      {/* action cell (rapi: sejajar, gak ada delete turun sendiri) */}
                      <TableCell className="py-4 pr-6">
                        <div className="flex justify-center">
                          <div className="inline-flex flex-wrap items-center justify-center gap-2">
                            <Button
                              size="sm"
                              className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold hover:brightness-110"
                              onClick={() =>
                                nav(`/employees/${r.id}/salary-profile/new`)
                              }
                            >
                              Set Salary
                            </Button>

                            {canManage && (
                              <>
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

        {!canManage && (
          <p className="text-xs text-slate-500">
            *Staff hanya bisa melihat data employee dan mengatur salary profile-nya. Edit/Delete hanya untuk FAT/DIRECTOR.
          </p>
        )}
      </div>
    </div>
  );
}
