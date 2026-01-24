import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { getUser, isAuthed, getToken } from "@/lib/auth";
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

/**
 * PAYROLL LIST (FULL)
 * - Kolom "Alasan (Reject)" dihapus dari tabel
 * - Saat status REJECTED: tampil ikon ⓘ kecil di samping badge (klik -> modal alasan)
 * - Tombol Edit TIDAK dihilangkan, tapi di-disable untuk status: requested/approved/paid
 * - Kolom Aksi dirapikan: posisinya center dan tombol seragam
 */
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

  // ===== ROLE =====
  const role = String(user?.role || "").toLowerCase();
  const isFAT = role === "fat";
  const isDirector = role === "director";
  const canAction = isFAT || isDirector;

  // =========================
  // ✅ MARK PAID MODAL STATE
  // =========================
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidTarget, setPaidTarget] = useState(null);
  const [paidFile, setPaidFile] = useState(null);
  const [paidRef, setPaidRef] = useState("");
  const [paidNote, setPaidNote] = useState("");
  const [paidSubmitting, setPaidSubmitting] = useState(false);

  // =========================
  // ✅ REJECT NOTE MODAL STATE
  // =========================
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);

  const openPaidModal = (row) => {
    setPaidTarget(row);
    setPaidFile(null);
    setPaidRef("");
    setPaidNote("");
    setPaidOpen(true);
  };

  const closePaidModal = () => {
    if (paidSubmitting) return;
    setPaidOpen(false);
    setPaidTarget(null);
    setPaidFile(null);
    setPaidRef("");
    setPaidNote("");
  };

  const openNoteModal = (row) => {
    setNoteTarget(row);
    setNoteOpen(true);
  };

  const closeNoteModal = () => {
    setNoteOpen(false);
    setNoteTarget(null);
  };

  // ===== Helpers =====
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

  const statusLower = (s) => String(s || "").toLowerCase();

  // ===== Load =====
  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      // Director default: only requested
      const qs = isDirector ? "?status=requested" : "";
      const data = await api(`/payrolls${qs}`);
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

  // ===== Actions =====
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

  const onRequestPayment = async (id) => {
    const ok = confirm("Kirim payroll ini ke Director untuk approval?");
    if (!ok) return;
    try {
      await api(`/payrolls/${id}/request-payment`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e?.message || "Gagal request approval.");
    }
  };

  const onApprove = async (id) => {
    const ok = confirm("Approve payroll ini?");
    if (!ok) return;
    try {
      await api(`/payrolls/${id}/approve`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e?.message || "Gagal approve payroll.");
    }
  };

  const onReject = async (id) => {
    const note = prompt("Alasan reject (wajib diisi):");
    if (!note) return alert("Alasan reject wajib diisi.");
    try {
      await api(`/payrolls/${id}/reject`, {
        method: "POST",
        body: { approval_note: note },
      });
      await load();
    } catch (e) {
      alert(e?.message || "Gagal reject payroll.");
    }
  };

  // ✅ MARK PAID (UPLOAD BUKTI) — pakai fetch + FormData
  const submitMarkPaid = async () => {
    if (!paidTarget?.id) return;

    if (!paidFile) {
      alert("Bukti transfer wajib di-upload dulu.");
      return;
    }

    setPaidSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("proof", paidFile);
      if (paidRef) fd.append("paid_ref", paidRef);
      if (paidNote) fd.append("paid_note", paidNote);

      const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const url = `${BASE_URL}/api/payrolls/${paidTarget.id}/mark-paid`;

      const token = getToken();

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      });

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }

      if (!res.ok) {
        const msg =
          data && typeof data === "object" && data.message
            ? data.message
            : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      closePaidModal();
      await load();
      alert("Berhasil! Payroll sudah PAID + bukti transfer tersimpan.");
    } catch (e) {
      alert(e?.message || "Gagal mark paid payroll.");
    } finally {
      setPaidSubmitting(false);
    }
  };

  // ===== Badges =====
  const AccessBadge = ({ masked }) => {
    if (masked) {
      return (
        <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
          MASKED
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
        NOMINAL OK
      </Badge>
    );
  };

  const StatusBadge = ({ status }) => {
    const s = statusLower(status);
    if (s === "paid") {
      return (
        <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
          PAID
        </Badge>
      );
    }
    if (s === "approved") {
      return (
        <Badge className="rounded-full border border-sky-200 bg-sky-50 text-sky-700">
          APPROVED
        </Badge>
      );
    }
    if (s === "requested") {
      return (
        <Badge className="rounded-full border border-amber-200 bg-amber-50 text-amber-800">
          REQUESTED
        </Badge>
      );
    }
    if (s === "rejected") {
      return (
        <Badge className="rounded-full border border-rose-200 bg-rose-50 text-rose-700">
          REJECTED
        </Badge>
      );
    }
    return (
      <Badge className="rounded-full border border-slate-200 bg-white text-slate-700">
        DRAFT
      </Badge>
    );
  };

  // ===== Options periode =====
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

  useEffect(() => {
    setPage(1);
  }, [q, period]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const masked = filtered.filter((x) => !!x.masked).length;
    const pending = filtered.filter(
      (x) => statusLower(x.status) === "requested"
    ).length;
    return { total, masked, pending };
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
                <span className="text-sm font-semibold text-slate-700">
                  Human Plus Institute
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
                Payroll
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Kelola dan lihat slip gaji per periode. Gunakan pencarian & filter
                agar lebih cepat.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Total: {loading ? "…" : summary.total}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Masked: {loading ? "…" : summary.masked}
                </span>

                {isDirector && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pending Approval: {loading ? "…" : summary.pending}
                  </span>
                )}
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

              {isFAT && (
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
              <div className="text-sm font-semibold text-slate-800">
                Cari Karyawan
              </div>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔎
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nama / kode karyawan..."
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                />
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="text-sm font-semibold text-slate-800">
                Filter Periode
              </div>
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
              <div className="text-sm font-semibold text-slate-900">
                Payroll Records
              </div>
              <div className="text-xs text-slate-500">
                Klik baris untuk membuka detail payroll.
              </div>
            </div>

            <div className="text-xs text-slate-500">
              {loading
                ? "Memuat..."
                : `Menampilkan ${
                    filtered.length === 0 ? 0 : start + 1
                  }-${Math.min(end, filtered.length)} dari ${filtered.length}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="px-10">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="px-8 first:pl-10 text-slate-700">
                      Karyawan
                    </TableHead>
                    <TableHead className="px-8 text-slate-700">Periode</TableHead>
                    <TableHead className="px-8 text-slate-700">Status</TableHead>
                    <TableHead className="px-8 text-slate-700">Alasan</TableHead>

                    {canAction && (
                      <TableHead className="px-8 text-right text-slate-700 w-[360px]">
                        Aksi
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paged.map((r, idx) => {
                    const st = statusLower(r.status);
                    const note = String(r.approval_note || "").trim();

                    // ✅ Edit tetap ada, tapi dikunci saat sudah masuk alur approval/pembayaran
                    const editLocked = ["requested", "approved", "paid"].includes(st);

                    return (
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
                              <div className="font-semibold text-slate-900">
                                {r.employee_name ?? "-"}
                              </div>
                              {r.employee_code && (
                                <div className="text-xs text-slate-500">
                                  {r.employee_code}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-8 text-slate-700">
                          <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                            {monthLabel(periodKey(r.periode))}
                          </span>
                        </TableCell>

                        {/* ✅ Status + info icon when rejected */}
                        <TableCell className="px-8">
                          <div className="inline-flex items-center gap-2">
                            <StatusBadge status={r.status} />

                          </div>
                        </TableCell>

                        <TableCell className="px-8">
                        {st === "rejected" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNoteModal(r);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 font-black hover:bg-rose-100"
                            title="Lihat alasan reject"
                            aria-label="Lihat alasan reject"
                          >
                            !
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>

                        {canAction && (
                          <TableCell
                            className="px-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* ✅ Aksi dibuat CENTER di cell */}
                            <div className="flex justify-end">
                              {/* ✅ width stabil, biar posisi tombol rapi */}
                              <div className="flex flex-wrap justify-end gap-2 min-w-[340px]">
                                {isDirector && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                                      onClick={() => navigate(`/payrolls/${r.id}`)}
                                    >
                                      Detail
                                    </Button>

                                    {st === "requested" && (
                                      <>
                                        <Button
                                          size="sm"
                                          className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                          onClick={() => onApprove(r.id)}
                                        >
                                          Approve
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-9 rounded-xl"
                                          onClick={() => onReject(r.id)}
                                        >
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}

                                {isFAT && (
                                  <>
                                    {st === "draft" && (
                                      <Button
                                        size="sm"
                                        className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={() => onRequestPayment(r.id)}
                                      >
                                        Request Approval
                                      </Button>
                                    )}

                                    {st === "approved" && (
                                      <Button
                                        size="sm"
                                        className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => openPaidModal(r)}
                                      >
                                        Mark Paid
                                      </Button>
                                    )}

                                    {/* ✅ Perbaiki: ganti warna biar gak tabrakan sama Delete */}

                                    {/* ✅ Edit tetap ada, tapi dikunci saat requested/approved/paid */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-9 rounded-xl border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                                      onClick={() => navigate(`/payrolls/${r.id}/edit`)}
                                      disabled={editLocked}
                                      title={
                                        editLocked
                                          ? "Tidak bisa edit karena payroll sudah masuk proses approval/pembayaran."
                                          : "Edit payroll"
                                      }
                                    >
                                      Edit
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-9 rounded-xl"
                                      onClick={() => onDelete(r.id)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {filtered.length === 0 && !loading && !err && (
                    <TableRow>
                      <TableCell
                        colSpan={canAction ? 5 : 4}
                        className="py-12 text-center text-slate-500"
                      >
                        Tidak ada data yang sesuai dengan pencarian / filter.
                      </TableCell>
                    </TableRow>
                  )}

                  {loading && (
                    <TableRow>
                      <TableCell
                        colSpan={canAction ? 5 : 4}
                        className="py-12 text-center text-slate-500"
                      >
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
              © {new Date().getFullYear()} Human Plus Institute — Payroll Internal
              System
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

      {/* ✅ MODAL MARK PAID */}
      {paidOpen && (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={closePaidModal}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(2,6,23,0.25)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200">
                <div className="text-lg font-black text-slate-900">
                  Mark Paid + Upload Bukti
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Wajib upload bukti transfer agar tidak asal klik “Paid”.
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">Payroll</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {paidTarget?.employee_name || "-"} (
                    {paidTarget?.employee_code || "-"})
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Periode: {monthLabel(periodKey(paidTarget?.periode))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Bukti Transfer <span className="text-rose-600">*</span>
                  </label>
                  <div className="text-xs text-slate-500 mt-1">
                    Format: PDF/JPG/PNG (maks 4MB).
                  </div>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    onChange={(e) => setPaidFile(e.target.files?.[0] || null)}
                    disabled={paidSubmitting}
                  />

                  {paidFile && (
                    <div className="mt-2 text-xs text-slate-600">
                      Dipilih:{" "}
                      <span className="font-semibold">{paidFile.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    No. Referensi Transfer (opsional)
                  </label>
                  <input
                    value={paidRef}
                    onChange={(e) => setPaidRef(e.target.value)}
                    placeholder="Contoh: MBANK-20260115-XYZ"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-sky-200/40 focus:border-sky-300"
                    disabled={paidSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800">
                    Catatan (opsional)
                  </label>
                  <textarea
                    value={paidNote}
                    onChange={(e) => setPaidNote(e.target.value)}
                    placeholder="Catatan untuk audit (opsional)"
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-indigo-200/40 focus:border-indigo-300"
                    disabled={paidSubmitting}
                  />
                </div>
              </div>

              <div className="px-6 py-5 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={closePaidModal}
                  disabled={paidSubmitting}
                >
                  Batal
                </Button>

                <Button
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold"
                  onClick={submitMarkPaid}
                  disabled={paidSubmitting || !paidFile}
                  title={!paidFile ? "Wajib upload bukti dulu" : "Simpan & tandai paid"}
                >
                  {paidSubmitting ? "Menyimpan..." : "Confirm Paid"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL LIHAT ALASAN REJECT */}
      {noteOpen && (
        <div className="fixed inset-0 z-[999]">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={closeNoteModal}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(2,6,23,0.25)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-900">
                    Alasan Reject
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {noteTarget?.employee_name || "-"} (
                    {noteTarget?.employee_code || "-"})
                    {" • "}
                    Periode: {monthLabel(periodKey(noteTarget?.periode))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={closeNoteModal}
                >
                  Tutup
                </Button>
              </div>

              <div className="px-6 py-6">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 whitespace-pre-wrap">
                  {String(noteTarget?.approval_note || "").trim() || "-"}
                </div>

                <div className="mt-4 flex justify-end">
                  {isFAT && statusLower(noteTarget?.status) === "rejected" && (
                    <Button
                      className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold"
                      onClick={() => navigate(`/payrolls/${noteTarget?.id}/edit`)}
                    >
                      Perbaiki Payroll
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
