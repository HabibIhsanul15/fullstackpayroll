import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchEmployeesLite,
  fetchCurrentSalaryProfile,
  createPayroll,
} from "../lib/payrollsApi";

export default function PayrollCreatePage() {
  const nav = useNavigate();

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [employees, setEmployees] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(true);

  const [form, setForm] = useState({
    employee_id: "",
    periode: todayISO, // kita pakai tanggal (bisa kamu ubah jadi bulan nanti)
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

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError("");
  }

  function moneyToNumber(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(String(v).replaceAll(",", "").trim());
    return Number.isFinite(n) ? n : null;
  }

  function validate() {
    const e = {};
    if (!form.employee_id) e.employee_id = "Pilih employee dulu.";
    if (!form.periode) e.periode = "Periode wajib diisi.";

    const gp = moneyToNumber(form.gaji_pokok);
    const tj = moneyToNumber(form.tunjangan);
    const pt = moneyToNumber(form.potongan);

    if (gp === null || gp < 0) e.gaji_pokok = "Gaji pokok harus angka >= 0.";
    if (tj === null || tj < 0) e.tunjangan = "Tunjangan harus angka >= 0.";
    if (pt === null || pt < 0) e.potongan = "Potongan harus angka >= 0.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const total = useMemo(() => {
    const gp = moneyToNumber(form.gaji_pokok) ?? 0;
    const tj = moneyToNumber(form.tunjangan) ?? 0;
    const pt = moneyToNumber(form.potongan) ?? 0;
    return gp + tj - pt;
  }, [form.gaji_pokok, form.tunjangan, form.potongan]);

  async function loadEmployees() {
    setLoadingEmp(true);
    setServerError("");
    try {
      const data = await fetchEmployeesLite();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      setServerError(e.message || "Gagal mengambil employees.");
    } finally {
      setLoadingEmp(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleGenerateFromProfile() {
    setServerError("");
    setErrors((prev) => ({ ...prev, employee_id: undefined }));

    if (!form.employee_id) {
      setErrors((prev) => ({ ...prev, employee_id: "Pilih employee dulu." }));
      return;
    }

    setLoadingProfile(true);
    try {
      const data = await fetchCurrentSalaryProfile(form.employee_id, form.periode);
      setProfileInfo(data);

      // data dari backend salaryProfile(): base_salary, allowance_fixed, deduction_fixed
      setField("gaji_pokok", data?.base_salary ?? "0");
      setField("tunjangan", data?.allowance_fixed ?? "0");
      setField("potongan", data?.deduction_fixed ?? "0");
    } catch (e) {
      setProfileInfo(null);
      setServerError(e.message || "Gagal generate dari salary profile.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setServerError("");

    try {
      const payload = {
        employee_id: Number(form.employee_id),
        periode: form.periode,
        gaji_pokok: moneyToNumber(form.gaji_pokok),
        tunjangan: moneyToNumber(form.tunjangan),
        potongan: moneyToNumber(form.potongan),
        catatan: form.catatan || null,
      };

      const data = await createPayroll(payload);

      const payrollId = data?.payroll?.id ?? data?.id; // jaga-jaga struktur responsenya beda
      if (!payrollId) {
        nav("/payrolls");
        return;
      }

      nav(`/payrolls/${payrollId}`);
    } catch (err) {
      // kalau backend kirim errors validasi
      const p = err?.payload;
      if (p?.errors) {
        const mapped = {};
        for (const k of Object.keys(p.errors)) {
          mapped[k] = Array.isArray(p.errors[k]) ? p.errors[k][0] : String(p.errors[k]);
        }
        setErrors(mapped);
      } else {
        setServerError(err.message || "Gagal membuat payroll.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h2 style={{ marginBottom: 6 }}>Create Payroll</h2>
      <p style={{ marginTop: 0, opacity: 0.7 }}>
        Pilih employee & periode, lalu generate dari salary profile, kemudian simpan payroll.
      </p>

      {serverError && (
        <div
          style={{
            background: "#fdecea",
            border: "1px solid #f5c2c7",
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            color: "#7a271a",
          }}
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 18,
          border: "1px solid #eee",
        }}
      >
        {/* Select Employee + Periode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Employee</label>
            <select
              value={form.employee_id}
              onChange={(e) => setField("employee_id", e.target.value)}
              style={inputStyle}
              disabled={loadingEmp}
            >
              <option value="">
                {loadingEmp ? "Loading..." : "-- pilih employee --"}
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} — {emp.name}
                </option>
              ))}
            </select>
            {errors.employee_id && <div style={errorStyle}>{errors.employee_id}</div>}
          </div>

          <div>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Periode</label>
            <input
              type="date"
              value={form.periode}
              onChange={(e) => setField("periode", e.target.value)}
              style={inputStyle}
            />
            {errors.periode && <div style={errorStyle}>{errors.periode}</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button
            type="button"
            onClick={handleGenerateFromProfile}
            disabled={loadingProfile || saving}
            style={btnGhost}
          >
            {loadingProfile ? "Generating..." : "Generate from Salary Profile"}
          </button>
          <button type="button" onClick={loadEmployees} disabled={saving} style={btnGhost}>
            Refresh Employees
          </button>
        </div>

        {profileInfo && (
          <div
            style={{
              marginTop: 14,
              background: "#f7f7f7",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              opacity: 0.9,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Salary Profile (aktif)</div>
            <div>Effective From: {profileInfo.effective_from}</div>
            <div>Suggested Total: {profileInfo.suggested_total}</div>
          </div>
        )}

        <hr style={{ margin: "18px 0", border: "none", borderTop: "1px solid #eee" }} />

        {/* Payroll Numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field
            label="Gaji Pokok"
            placeholder="5000000"
            value={form.gaji_pokok}
            onChange={(v) => setField("gaji_pokok", v)}
            error={errors.gaji_pokok}
          />

          <Field
            label="Tunjangan"
            placeholder="1000000"
            value={form.tunjangan}
            onChange={(v) => setField("tunjangan", v)}
            error={errors.tunjangan}
          />

          <Field
            label="Potongan"
            placeholder="500000"
            value={form.potongan}
            onChange={(v) => setField("potongan", v)}
            error={errors.potongan}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Catatan</label>
          <textarea
            value={form.catatan}
            onChange={(e) => setField("catatan", e.target.value)}
            style={{ ...inputStyle, minHeight: 90 }}
            placeholder="Opsional..."
          />
          {errors.catatan && <div style={errorStyle}>{errors.catatan}</div>}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafafa",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 700 }}>Total: {String(total)}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={btnPrimary}>
              {saving ? "Saving..." : "Save Payroll"}
            </button>
            <button type="button" onClick={() => nav("/payrolls")} disabled={saving} style={btnGhost}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, error }) {
  return (
    <div>
      <label style={{ fontWeight: 600, fontSize: 14 }}>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  outline: "none",
  marginTop: 6,
};

const errorStyle = {
  marginTop: 6,
  color: "#b42318",
  fontSize: 13,
};

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
};

const btnGhost = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
};
