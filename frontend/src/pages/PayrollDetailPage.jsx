import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchPayrollDetail } from "@/lib/payrollsApi";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatIDR(n) {
  const num = Number(n ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(safe);
}

function periodKey(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}$/.test(s)) return s; // YYYY-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 7); // YYYY-MM-DD -> YYYY-MM
  return s.length >= 7 ? s.slice(0, 7) : s;
}

function monthLabel(yyyyMM) {
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
}

function StatusBadge({ masked }) {
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
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value ?? "-"}</div>
    </div>
  );
}

export default function PayrollDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const openPayrollPdf = async (payrollId) => {
    try {
      setPdfLoading(true);

      const token = getToken();
      if (!token) throw new Error("Token login tidak ditemukan. Silakan login ulang.");

      // buka tab dulu supaya popup tidak diblok
      const newTab = window.open("", "_blank", "noopener,noreferrer");

      const res = await fetch(`${API_BASE}/api/payrolls/${payrollId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf",
        },
      });

      if (!res.ok) {
        if (newTab) newTab.close();
        throw new Error(`Gagal membuka PDF (${res.status}).`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (newTab) newTab.location.href = url;
      else window.location.href = url;

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      alert(e?.message || "Gagal membuka PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");

    fetchPayrollDetail(id)
      .then((data) => mounted && setRow(data?.data ?? data))
      .catch((e) => mounted && setErr(e?.message || "Gagal memuat detail."))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

  const periodeLabel = useMemo(() => monthLabel(periodKey(row?.periode)), [row?.periode]);

  const computedTotal = useMemo(() => {
    if (!row) return 0;
    if (row.total !== null && row.total !== undefined) return row.total;
    const gp = Number(row.gaji_pokok ?? 0);
    const tj = Number(row.tunjangan ?? 0);
    const pt = Number(row.potongan ?? 0);
    return gp + tj - pt;
  }, [row]);

  return (
    <div className="relative">
      {/* Soft background (selaras PayrollList) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.10),transparent_45%),radial-gradient(circle_at_80%_18%,rgba(99,102,241,0.10),transparent_48%)]" />
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-sm font-semibold text-slate-700">
                Human Plus Institute
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Slip Gaji
              </h1>
              {!loading && row && <StatusBadge masked={!!row.masked} />}
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Periode:{" "}
              <span className="font-semibold text-slate-800">{periodeLabel || "-"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => nav(-1)}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              Kembali
            </Button>

            <Button
              variant="outline"
              onClick={() => row?.id && openPayrollPdf(row.id)}
              disabled={!row || row.masked || pdfLoading}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
              title={row?.masked ? "Tidak punya akses melihat nominal" : "Buka PDF di tab baru"}
            >
              {pdfLoading ? "Membuka PDF..." : "Buka PDF (Print)"}
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] px-6 py-6 text-sm text-slate-500">
            Loading slip gaji...
          </div>
        )}

        {/* Error */}
        {!loading && err && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
            <div className="font-bold text-rose-800 mb-1">Gagal memuat data</div>
            {err}
          </div>
        )}

        {/* Content */}
        {!loading && !err && row && (
          <div className="space-y-6">
            {/* Informasi Karyawan */}
            <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Informasi Karyawan
                  </div>
                  <div className="text-xs text-slate-500">
                    Ringkasan data pegawai dan pembuat payroll.
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  ID: <span className="font-semibold text-slate-700">{id}</span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <InfoItem label="Nama" value={row.employee_name || "-"} />
                </div>
                <div className="md:col-span-3">
                  <InfoItem label="Kode" value={row.employee_code || "-"} />
                </div>
                <div className="md:col-span-3">
                  <InfoItem
                    label="Status"
                    value={
                      <span
                        className={[
                          "inline-flex items-center gap-2",
                          row.employee_status === "inactive"
                            ? "text-rose-700"
                            : "text-emerald-700",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            row.employee_status === "inactive"
                              ? "bg-rose-500"
                              : "bg-emerald-500",
                          ].join(" ")}
                        />
                        {row.employee_status || "-"}
                      </span>
                    }
                  />
                </div>
                <div className="md:col-span-6">
                  <InfoItem label="Dibuat oleh" value={row.created_by || "-"} />
                </div>
              </div>
            </div>

            {/* Rincian Gaji */}
            <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Rincian Gaji
                  </div>
                  <div className="text-xs text-slate-500">
                    Nominal hanya tampil jika kamu punya akses.
                  </div>
                </div>

                {!row.masked ? (
                  <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                    Visible
                  </Badge>
                ) : (
                  <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                    Restricted
                  </Badge>
                )}
              </div>

              <div className="p-6">
                {row.masked ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                    Kamu tidak memiliki akses untuk melihat nominal gaji.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-1 divide-y divide-slate-200">
                      <div className="flex items-center justify-between px-5 py-4 bg-white">
                        <span className="text-sm text-slate-600">Gaji Pokok</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatIDR(row.gaji_pokok)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between px-5 py-4 bg-white/80">
                        <span className="text-sm text-slate-600">Tunjangan</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatIDR(row.tunjangan)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between px-5 py-4 bg-white">
                        <span className="text-sm text-slate-600">Potongan</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatIDR(row.potongan)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-sky-50 to-indigo-50">
                        <span className="text-sm font-extrabold text-slate-900">Total</span>
                        <span className="text-base font-extrabold text-slate-900">
                          {formatIDR(computedTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {!!row.catatan && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 px-5 py-4">
                    <div className="text-[11px] text-slate-500">Catatan</div>
                    <div className="mt-1 text-sm text-slate-800">{row.catatan}</div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                <span>© {new Date().getFullYear()} Human Plus Institute</span>
                <span>Payroll Internal System</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
