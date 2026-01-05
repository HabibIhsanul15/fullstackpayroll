import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { getUser, isAuthed } from "@/lib/auth";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PayrollList() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const navigate = useNavigate();
  const user = getUser();
  const canManage = user?.role === "fat" || user?.role === "director";

  // ===== Helpers: Periode Bulan-Tahun (YYYY-MM) =====
  const periodKey = (value) => {
    const s = String(value || "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7);
    return s.length >= 7 ? s.slice(0, 7) : s;
  };

  const monthLabel = (yyyyMM) => {
    if (!/^\d{4}-\d{2}$/.test(yyyyMM)) return yyyyMM || "-";
    const [y, m] = yyyyMM.split("-");
    const map = {
      "01": "Jan",
      "02": "Feb",
      "03": "Mar",
      "04": "Apr",
      "05": "Mei",
      "06": "Jun",
      "07": "Jul",
      "08": "Agu",
      "09": "Sep",
      "10": "Okt",
      "11": "Nov",
      "12": "Des",
    };
    return `${map[m] || m} ${y}`;
  };

  const initials = (name) => {
    const s = String(name || "").trim();
    if (!s) return "N";
    return s[0].toUpperCase();
  };

  // ===== Load =====
  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await api("/payrolls");
      setRows(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      setErr(e?.message || "Gagal memuat data payroll.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthed()) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (id) => {
    const ok = confirm("Yakin mau hapus payroll ini?");
    if (!ok) return;
    try {
      await api(`/payrolls/${id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.message || "Gagal menghapus payroll.");
    }
  };

  const StatusBadge = ({ masked }) => {
    if (masked) {
      return (
        <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
          MASKED
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
        OK
      </Badge>
    );
  };

  // ===== Options periode (bulan-tahun) =====
  const periodOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const key = periodKey(r?.periode);
      if (key) set.add(key);
    });
    const sorted = Array.from(set).sort((a, b) => (a < b ? 1 : -1));
    return ["all", ...sorted];
  }, [rows]);

  // ===== Filter =====
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const name = String(r?.employee_name ?? "").toLowerCase();
      const code = String(r?.employee_code ?? "").toLowerCase();
      const pKey = periodKey(r?.periode);

      const matchQ = !qq || name.includes(qq) || code.includes(qq);
      const matchP = period === "all" || pKey === period;

      return matchQ && matchP;
    });
  }, [rows, q, period]);

  // reset page kalau filter berubah
  useEffect(() => {
    setPage(1);
  }, [q, period]);

  // ===== Summary =====
  const summary = useMemo(() => {
    const total = filtered.length;
    const ok = filtered.filter((x) => !x.masked).length;
    const masked = filtered.filter((x) => !!x.masked).length;
    return { total, ok, masked };
  }, [filtered]);

  const resetFilters = () => {
    setQ("");
    setPeriod("all");
  };

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paged = filtered.slice(start, end);

  const pageItems = useMemo(() => {
    // tampilkan maksimal 7 tombol: 1 ... 3 4 5 ... last
    const items = [];
    const add = (v) => items.push(v);

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) add(i);
      return items;
    }

    add(1);
    if (safePage > 3) add("…");

    const from = Math.max(2, safePage - 1);
    const to = Math.min(totalPages - 1, safePage + 1);
    for (let i = from; i <= to; i++) add(i);

    if (safePage < totalPages - 2) add("…");
    add(totalPages);

    return items;
  }, [safePage, totalPages]);

  return (
    <div className="relative">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.10),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_48%)]" />
      </div>

      <div className="space-y-6">
        {/* Header card */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur shadow-[0_16px_50px_rgba(2,6,23,0.06)] p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-sm font-semibold text-slate-700">Human Plus Institute</span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Payroll</h1>
              <p className="mt-1 text-sm text-slate-600">
                Kelola dan lihat slip gaji per periode. Gunakan pencarian & filter agar lebih cepat.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Total: {loading ? "…" : summary.total}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  OK: {loading ? "…" : summary.ok}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Masked: {loading ? "…" : summary.masked}
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
                  onClick={() => navigate("/payrolls/new")}
                  className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
                >
                  + Create Payroll
                </Button>
              )}
            </div>
          </div>

          {err && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          )}
        </div>

        {/* Filter card */}
        <div className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)]">
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <div className="text-sm font-semibold text-slate-800">Cari Karyawan</div>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nama / kode karyawan..."
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="text-sm font-semibold text-slate-800">Filter Periode</div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === "all" ? "Semua periode" : monthLabel(p)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex md:justify-end">
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

        {/* Table card */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Payroll Records</div>
              <div className="text-xs text-slate-500">Klik baris untuk membuka detail payroll.</div>
            </div>

            <div className="text-xs text-slate-500">
              {loading ? "Memuat..." : `Menampilkan ${filtered.length === 0 ? 0 : start + 1}-${Math.min(end, filtered.length)} dari ${filtered.length}`}
            </div>
          </div>
            <div className="overflow-x-auto">
              <div className="px-10"> {/* <- ini yang bikin jarak dari pinggir card */}
                <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-slate-50/80">
                  {/* padding tabel biar ga mepet */}
                  <TableHead className="px-8 first:pl-10 text-slate-700">Karyawan</TableHead>
                  <TableHead className="px-8 text-slate-700">Periode</TableHead>
                  <TableHead className="px-8 text-slate-700">Status</TableHead>
                  {canManage && (
                    <TableHead className="px-8 text-right text-slate-700 w-[200px]">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {paged.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    className={[
                      "cursor-pointer transition",
                      idx % 2 === 0 ? "bg-white/40" : "bg-white/20",
                      "hover:bg-slate-50/80",
                    ].join(" ")}
                    onClick={() => navigate(`/payrolls/${r.id}`)}
                  >
                    <TableCell className="px-8 first:pl-10 py-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-sm font-extrabold text-slate-700 shadow-sm">
                          {initials(r.employee_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{r.employee_name ?? "-"}</div>
                          {r.employee_code && <div className="text-xs text-slate-500">{r.employee_code}</div>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-8 text-slate-700">
                      <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                        {monthLabel(periodKey(r.periode))}
                      </span>
                    </TableCell>

                    <TableCell className="px-8">
                      <StatusBadge masked={r.masked} />
                    </TableCell>

                    {canManage && (
                      <TableCell className="px-8 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                            onClick={() => navigate(`/payrolls/${r.id}/edit`)}
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
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {filtered.length === 0 && !loading && !err && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-500">
                      Tidak ada data yang sesuai dengan pencarian / filter.
                    </TableCell>
                  </TableRow>
                )}

                {loading && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="py-12 text-center text-slate-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="px-8 py-5 border-t border-slate-200/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              © {new Date().getFullYear()} Human Plus Institute — Payroll Internal System
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Prev
              </Button>

              {pageItems.map((it, i) =>
                it === "…" ? (
                  <span key={`dots-${i}`} className="px-2 text-slate-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={it}
                    onClick={() => setPage(it)}
                    className={[
                      "h-9 min-w-9 px-3 rounded-xl text-sm font-semibold border transition",
                      it === safePage
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {it}
                  </button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
