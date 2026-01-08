import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchEmployeesLite,
  fetchCurrentSalaryProfile,
  createPayroll,
} from "../lib/payrollsApi";
import { Button } from "@/components/ui/button";

function toNumber(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replaceAll(",", "").trim());
  return Number.isFinite(n) ? n : null;
}

function formatIDR(v) {
  const n = toNumber(v) ?? 0;
  try {
    return new Intl.NumberFormat("id-ID").format(n);
  } catch {
    return String(n);
  }
}

  function monthToFirstDate(yyyyMM) {
    if (!yyyyMM) return "";
    if (/^\d{4}-\d{2}$/.test(yyyyMM)) return `${yyyyMM}-01`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(yyyyMM)) return yyyyMM;
    return "";
  }

  function monthToEndDate(yyyyMM) {
    if (!/^\d{4}-\d{2}$/.test(yyyyMM)) return "";
    const [y, m] = yyyyMM.split("-").map(Number);
    // JS: bulan 1-12, end day = new Date(y, m, 0)
    const last = new Date(y, m, 0);
    const yyyy = last.getFullYear();
    const mm = String(last.getMonth() + 1).padStart(2, "0");
    const dd = String(last.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

export default function PayrollCreatePage() {
  const nav = useNavigate();

  const thisMonth = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`; // YYYY-MM
  }, []);

  const [employees, setEmployees] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);

  const [form, setForm] = useState({
    employee_id: "",
    periode: thisMonth,
    gaji_pokok: "",
    tunjangan: "",
    potongan: "",
    catatan: "",
  });

  const [profileInfo, setProfileInfo] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [ok, setOk] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError("");
    setOk("");
  }

  function validate() {
    const e = {};
    if (!form.employee_id) e.employee_id = "Pilih employee dulu.";
if (!form.periode) e.periode = "Periode wajib diisi.";
else if (!/^\d{4}-\d{2}$/.test(form.periode)) e.periode = "Format periode harus YYYY-MM.";

    const gp = toNumber(form.gaji_pokok);
    const tj = toNumber(form.tunjangan);
    const pt = toNumber(form.potongan);

    if (gp === null || gp < 0) e.gaji_pokok = "Gaji pokok harus angka >= 0.";
    if (tj === null || tj < 0) e.tunjangan = "Tunjangan harus angka >= 0.";
    if (pt === null || pt < 0) e.potongan = "Potongan harus angka >= 0.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const total = useMemo(() => {
    const gp = toNumber(form.gaji_pokok) ?? 0;
    const tj = toNumber(form.tunjangan) ?? 0;
    const pt = toNumber(form.potongan) ?? 0;
    return gp + tj - pt;
  }, [form.gaji_pokok, form.tunjangan, form.potongan]);

  async function loadEmployees() {
    setLoadingEmp(true);
    setServerError("");
    try {
      const data = await fetchEmployeesLite("active");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      setServerError(e?.message || "Gagal mengambil employees.");
      setEmployees([]);
    } finally {
      setLoadingEmp(false);
    }
  }

  useEffect(() => {
    setProfileInfo(null);
    setServerError("");
    setOk("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.employee_id, form.periode]);

  async function handleGenerateFromProfile() {
    setServerError("");
    setOk("");
    setErrors((prev) => ({ ...prev, employee_id: undefined }));

    if (!form.employee_id) {
      setErrors((prev) => ({ ...prev, employee_id: "Pilih employee dulu." }));
      return;
    }

    setLoadingProfile(true);
    try {
    const data = await fetchCurrentSalaryProfile(
      form.employee_id,
      monthToEndDate(form.periode) // ✅ pakai akhir bulan
    );


      setProfileInfo(data);

      setField("gaji_pokok", String(data?.base_salary ?? "0"));
      setField("tunjangan", String(data?.allowance_fixed ?? "0"));
      setField("potongan", String(data?.deduction_fixed ?? "0"));
      setOk("Berhasil generate dari salary profile.");
    } catch (e) {
      setProfileInfo(null);
      setServerError(e?.message || "Gagal generate dari salary profile.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setServerError("");
    setOk("");

    try {
      const payload = {
        employee_id: Number(form.employee_id),
        periode: monthToFirstDate(form.periode), // YYYY-MM-01
        gaji_pokok: toNumber(form.gaji_pokok),
        tunjangan: toNumber(form.tunjangan),
        potongan: toNumber(form.potongan),
        catatan: form.catatan || null,
      };

      const data = await createPayroll(payload);
      const payrollId = data?.data?.id ?? data?.payroll?.id ?? data?.id;

      setOk("Payroll berhasil dibuat.");

      if (!payrollId) {
        nav("/payrolls");
        return;
      }
      nav(`/payrolls/${payrollId}`);
    } catch (err) {
      const p = err?.payload;

      if (p?.errors) {
        const mapped = {};
        for (const k of Object.keys(p.errors)) {
          mapped[k] = Array.isArray(p.errors[k]) ? p.errors[k][0] : String(p.errors[k]);
        }
        setErrors(mapped);
      } else {
        setServerError(err?.message || "Gagal membuat payroll.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      {/* soft background selaras payroll list/edit */}
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

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
              Create Payroll
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Pilih employee & periode, generate dari salary profile, lalu simpan payroll.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => nav(-1)}
              disabled={saving}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
            >
              Back
            </Button>

            <Button
              type="submit"
              form="create-payroll-form"
              disabled={saving}
              className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
            >
              {saving ? "Saving..." : "Save Payroll"}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {serverError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}
        {ok && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {ok}
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Payroll Generator
              </div>
              <div className="text-xs text-slate-500">
                Generate otomatis dari salary profile, tetap bisa edit manual sebelum simpan.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={loadEmployees}
                disabled={saving}
                className="rounded-2xl border-slate-200 bg-white hover:bg-slate-50"
              >
                Refresh Employees
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateFromProfile}
                disabled={loadingProfile || saving}
                className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
              >
                {loadingProfile ? "Generating..." : "Generate from Salary Profile"}
              </Button>
            </div>
          </div>

          <div className="p-6">
            <form id="create-payroll-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Employee + Periode */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7">
                  <label className="text-sm font-semibold text-slate-800">
                    Employee (Active)
                  </label>

                  <select
                    value={form.employee_id}
                    onChange={(e) => setField("employee_id", e.target.value)}
                    disabled={loadingEmp}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                  >
                    <option value="">
                      {loadingEmp
                        ? "Loading..."
                        : employees.length
                        ? "-- pilih employee --"
                        : "Tidak ada employee active"}
                    </option>

                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code} — {emp.name}
                      </option>
                    ))}
                  </select>

                  {errors.employee_id && (
                    <div className="mt-2 text-sm text-rose-700">
                      {errors.employee_id}
                    </div>
                  )}
                </div>

                <div className="md:col-span-5">
                  <label className="text-sm font-semibold text-slate-800">Periode</label>
                  <input
                    type="month"
                    value={form.periode}
                    onChange={(e) => setField("periode", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                  />
                  {errors.periode && (
                    <div className="mt-2 text-sm text-rose-700">{errors.periode}</div>
                  )}
                </div>
              </div>

              {/* Salary profile info */}
              {profileInfo && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4 text-sm text-slate-700">
                  <div className="font-extrabold text-slate-900 mb-2">
                    Salary Profile (aktif)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <Info label="Effective From" value={profileInfo.effective_from || "-"} />
                    <Info label="Suggested Total" value={profileInfo.suggested_total ?? "-"} />
                    <Info label="Note" value="Auto fill base/allowance/deduction" />
                  </div>
                </div>
              )}

              {/* Payroll numbers */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <MoneyField
                    label="Gaji Pokok"
                    value={form.gaji_pokok}
                    onChange={(v) => setField("gaji_pokok", v)}
                    error={errors.gaji_pokok}
                    hint={`Rp ${formatIDR(form.gaji_pokok)}`}
                  />
                </div>

                <div className="md:col-span-4">
                  <MoneyField
                    label="Tunjangan"
                    value={form.tunjangan}
                    onChange={(v) => setField("tunjangan", v)}
                    error={errors.tunjangan}
                    hint={`Rp ${formatIDR(form.tunjangan)}`}
                  />
                </div>

                <div className="md:col-span-4">
                  <MoneyField
                    label="Potongan"
                    value={form.potongan}
                    onChange={(v) => setField("potongan", v)}
                    error={errors.potongan}
                    hint={`Rp ${formatIDR(form.potongan)}`}
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="text-sm font-semibold text-slate-800">Catatan</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setField("catatan", e.target.value)}
                  rows={4}
                  placeholder="Opsional..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                />
                {errors.catatan && (
                  <div className="mt-2 text-sm text-rose-700">{errors.catatan}</div>
                )}
              </div>

              {/* Total preview + actions */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Total (preview)</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    Rp {formatIDR(total)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Total = gaji pokok + tunjangan − potongan
                  </div>
                </div>

                <div className="flex gap-2 sm:justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
                  >
                    {saving ? "Saving..." : "Save Payroll"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => nav("/payrolls")}
                    disabled={saving}
                    className="rounded-2xl border-slate-200 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* tiny footer */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
          <span>© {new Date().getFullYear()} Human Plus Institute</span>
          <span>Payroll Internal System</span>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">
        {String(value ?? "-")}
      </div>
    </div>
  );
}

function MoneyField({ label, value, onChange, error, hint }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-800">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        inputMode="numeric"
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
      />
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
      {error && <div className="mt-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}
