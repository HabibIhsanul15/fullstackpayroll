import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../lib/auth";
import { Button } from "@/components/ui/button";

export default function EmployeeCreatePage() {
  const navigate = useNavigate();

  const API_BASE = useMemo(() => {
    return import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  }, []);

  const [form, setForm] = useState({
    employee_code: "",
    name: "",
    department: "Finance",
    position: "Staff",
    status: "active",

    // private/sensitive
    nik: "",
    npwp: "",
    phone: "",
    address: "",

    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError("");
  }

  function validate() {
    const e = {};
    if (!form.employee_code.trim())
      e.employee_code = "Employee code wajib diisi (contoh: EMP-001).";
    if (!form.name.trim()) e.name = "Nama wajib diisi.";
    if (!form.department.trim()) e.department = "Department wajib diisi.";
    if (!form.position.trim()) e.position = "Position wajib diisi.";
    if (!["active", "inactive"].includes(form.status))
      e.status = "Status tidak valid.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;

    const token = getToken();
    if (!token) {
      setServerError("Token login tidak ditemukan. Silakan login ulang.");
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch(`${API_BASE}/api/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.errors) {
          const mapped = {};
          for (const k of Object.keys(data.errors)) {
            mapped[k] = Array.isArray(data.errors[k])
              ? data.errors[k][0]
              : String(data.errors[k]);
          }
          setErrors(mapped);
        } else {
          setServerError(data?.message || "Gagal menyimpan employee.");
        }
        return;
      }

      const employeeId = data?.employee?.id;
      if (!employeeId) {
        setServerError(
          "Employee berhasil dibuat, tapi ID tidak terbaca dari response."
        );
        return;
      }

      navigate(`/employees/${employeeId}/salary-profile/new`);
    } catch (err) {
      setServerError(
        "Tidak bisa terhubung ke server. Pastikan backend Laravel jalan."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* soft background (samain nuansa Payroll/Employees) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[620px] w-[620px] rounded-full bg-indigo-200/35 blur-3xl" />
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
              Create Employee
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Isi data pegawai. Setelah ini lanjut ke salary profile.
            </p>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
            onClick={() => navigate("/employees")}
            disabled={loading}
          >
            Back
          </Button>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}

        {/* Form card */}
        <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur-xl shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200/70">
            <div className="text-sm font-semibold text-slate-900">
              Employee Form
            </div>
            <div className="text-xs text-slate-500">
              Lengkapi basic info, private info, dan bank info.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* BASIC INFO */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Basic Information
                </h3>
                <span className="text-xs text-slate-500">
                  Field bertanda * wajib diisi
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Employee Code *"
                  placeholder="EMP-001"
                  value={form.employee_code}
                  onChange={(v) => setField("employee_code", v.toUpperCase())}
                  error={errors.employee_code}
                />

                <Field
                  label="Name *"
                  placeholder="Pegawai Satu"
                  value={form.name}
                  onChange={(v) => setField("name", v)}
                  error={errors.name}
                />

                <Field
                  label="Department *"
                  value={form.department}
                  onChange={(v) => setField("department", v)}
                  error={errors.department}
                />

                <Field
                  label="Position *"
                  value={form.position}
                  onChange={(v) => setField("position", v)}
                  error={errors.position}
                />

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Status *
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    className={[
                      "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition",
                      "border-slate-200 bg-white text-slate-900",
                      "focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40",
                      errors.status ? "border-rose-300" : "",
                    ].join(" ")}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                  {errors.status && (
                    <div className="text-xs text-rose-700">{errors.status}</div>
                  )}
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-200/70" />

            {/* PRIVATE / SENSITIVE INFO */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Private / Sensitive Info
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="NIK"
                  placeholder="3273xxxxxxxxxxxx"
                  value={form.nik}
                  onChange={(v) => setField("nik", v)}
                  error={errors.nik}
                />

                <Field
                  label="NPWP"
                  placeholder="xx.xxx.xxx.x-xxx.xxx"
                  value={form.npwp}
                  onChange={(v) => setField("npwp", v)}
                  error={errors.npwp}
                />

                <Field
                  label="Phone"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(v) => setField("phone", v)}
                  error={errors.phone}
                />

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Address
                  </label>
                  <textarea
                    value={form.address}
                    placeholder="Alamat lengkap..."
                    onChange={(e) => setField("address", e.target.value)}
                    className={[
                      "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition min-h-[90px]",
                      "border-slate-200 bg-white text-slate-900",
                      "focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40",
                      errors.address ? "border-rose-300" : "",
                    ].join(" ")}
                  />
                  {errors.address && (
                    <div className="text-xs text-rose-700">{errors.address}</div>
                  )}
                </div>

                <Field
                  label="Bank Name"
                  placeholder="BCA / BRI / Mandiri"
                  value={form.bank_name}
                  onChange={(v) => setField("bank_name", v)}
                  error={errors.bank_name}
                />

                <Field
                  label="Bank Account Name"
                  placeholder="Nama pemilik rekening"
                  value={form.bank_account_name}
                  onChange={(v) => setField("bank_account_name", v)}
                  error={errors.bank_account_name}
                />

                <Field
                  label="Bank Account Number"
                  placeholder="1234567890"
                  value={form.bank_account_number}
                  onChange={(v) => setField("bank_account_number", v)}
                  error={errors.bank_account_number}
                />
              </div>
            </section>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
              >
                {loading ? "Saving..." : "Save Employee"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/employees")}
                disabled={loading}
                className="rounded-2xl bg-white/70 border-slate-200 hover:bg-white"
              >
                Cancel
              </Button>
            </div>
          </form>

          <div className="px-6 py-4 border-t border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} Human Plus Institute</span>
            <span>Payroll Internal System</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, error }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition",
          "border-slate-200 bg-white text-slate-900",
          "focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40",
          error ? "border-rose-300" : "",
        ].join(" ")}
      />
      {error && <div className="text-xs text-rose-700">{error}</div>}
    </div>
  );
}
