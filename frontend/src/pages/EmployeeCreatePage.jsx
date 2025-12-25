import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../lib/auth";

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
      setServerError("Tidak bisa terhubung ke server. Pastikan backend Laravel jalan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <h2 style={{ marginBottom: 6 }}>Create Employee</h2>
      <p style={{ marginTop: 0, opacity: 0.7 }}>
        Isi data pegawai. Setelah ini lanjut ke salary profile.
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
        {/* BASIC INFO */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field
            label="Employee Code"
            placeholder="EMP-001"
            value={form.employee_code}
            onChange={(v) => setField("employee_code", v.toUpperCase())}
            error={errors.employee_code}
          />

          <Field
            label="Name"
            placeholder="Pegawai Satu"
            value={form.name}
            onChange={(v) => setField("name", v)}
            error={errors.name}
          />

          <Field
            label="Department"
            value={form.department}
            onChange={(v) => setField("department", v)}
            error={errors.department}
          />

          <Field
            label="Position"
            value={form.position}
            onChange={(v) => setField("position", v)}
            error={errors.position}
          />

          <div>
            <label style={{ fontWeight: 600, fontSize: 14 }}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              style={inputStyle}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            {errors.status && <div style={errorStyle}>{errors.status}</div>}
          </div>
        </div>

        <hr
          style={{
            margin: "18px 0",
            border: "none",
            borderTop: "1px solid #eee",
          }}
        />

        {/* PRIVATE / SENSITIVE INFO */}
        <div style={{ marginTop: 6 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 10 }}>
            Private / Sensitive Info
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Address</label>
              <textarea
                value={form.address}
                placeholder="Alamat lengkap..."
                onChange={(e) => setField("address", e.target.value)}
                style={{ ...inputStyle, minHeight: 90 }}
              />
              {errors.address && <div style={errorStyle}>{errors.address}</div>}
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
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? "Saving..." : "Save Employee"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/employees")}
            disabled={loading}
            style={btnGhost}
          >
            Cancel
          </button>
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
