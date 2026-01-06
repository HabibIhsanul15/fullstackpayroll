import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getToken } from "../lib/auth";

export default function SalaryProfileCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    []
  );

  const [form, setForm] = useState({
    base_salary: "",
    allowance_fixed: "",
    deduction_fixed: "",
    effective_from: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const token = getToken();
    setLoading(true);
    setServerError("");

    try {
      const payload = {
        ...form,
        base_salary: Number(form.base_salary || 0),
        allowance_fixed: Number(form.allowance_fixed || 0),
        deduction_fixed: Number(form.deduction_fixed || 0),
      };

      const res = await fetch(`${API_BASE}/api/employees/${id}/salary-profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data?.message || "Gagal menyimpan profil gaji.");
        return;
      }

      navigate("/employees");
    } catch (err) {
      setServerError("Tidak bisa terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  }

  const totalPreview =
    Number(form.base_salary || 0) +
    Number(form.allowance_fixed || 0) -
    Number(form.deduction_fixed || 0);

  return (
    <div style={pageWrap}>
      {/* Header ala Payroll */}
      <div style={headerBar}>
        <div>
          <h1 style={title}>Atur Profil Gaji</h1>
          <p style={subtitle}>Isi struktur gaji untuk karyawan ini.</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            style={btnGhost}
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Back
          </button>
          <button
            type="submit"
            form="salaryProfileForm"
            style={btnPrimary}
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan Profil Gaji"}
          </button>
        </div>
      </div>

      {serverError && (
        <div style={alertError}>
          <b>Gagal:</b> {serverError}
        </div>
      )}

      {/* Card utama */}
      <div style={card}>
        <div style={cardHeader}>
          <div>
            <div style={cardTitle}>Profil Gaji</div>
            <div style={cardDesc}>
              Data ini akan digunakan saat generate payroll.
            </div>
          </div>
          <div style={pill}>Salary Profile</div>
        </div>

        <form id="salaryProfileForm" onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <div style={grid2}>
            <Field
              label="Gaji Pokok"
              placeholder="contoh: 5000000"
              value={form.base_salary}
              onChange={(v) => setField("base_salary", v)}
            />
            <Field
              label="Tunjangan Tetap"
              placeholder="contoh: 500000"
              value={form.allowance_fixed}
              onChange={(v) => setField("allowance_fixed", v)}
            />
            <Field
              label="Potongan Tetap"
              placeholder="contoh: 200000"
              value={form.deduction_fixed}
              onChange={(v) => setField("deduction_fixed", v)}
            />
            <div>
              <label style={label}>Berlaku Mulai</label>
              <input
                type="date"
                value={form.effective_from}
                onChange={(e) => setField("effective_from", e.target.value)}
                style={input}
              />
            </div>
          </div>

          {/* Preview Total ala payroll */}
          <div style={previewBox}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Total (preview)</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {formatIDR(totalPreview)}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Total = gaji pokok + tunjangan − potongan
            </div>
          </div>

          {/* Tombol bawah (biar mirip Payroll) */}
          <div style={actionsRow}>
            <button
              type="button"
              style={btnGhost}
              onClick={() => navigate("/employees")}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Profil Gaji"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */
function Field({ label: labelText, placeholder, value, onChange }) {
  return (
    <div>
      <label style={label}>{labelText}</label>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={input}
      />
      <div style={helper}>Rp {formatNumber(value || 0)}</div>
    </div>
  );
}

/* ---------- Utils ---------- */
function formatNumber(n) {
  const num = Number(n || 0);
  return num.toLocaleString("id-ID");
}
function formatIDR(n) {
  const num = Number(n || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

/* ---------- Styles (nuansa payroll) ---------- */
const pageWrap = { maxWidth: 1180, margin: "0 auto", padding: "18px 18px 28px" };

const headerBar = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: "1px solid #eee",
};

const title = { margin: 0, fontSize: 32, letterSpacing: -0.4 };
const subtitle = { margin: "6px 0 0", opacity: 0.7 };

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  border: "1px solid #eee",
  boxShadow: "0 10px 30px rgba(15,23,42,.06)",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const cardTitle = { fontWeight: 800, fontSize: 16 };
const cardDesc = { marginTop: 4, fontSize: 12, opacity: 0.7 };

const pill = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#111827",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const label = { display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#111827" };

const input = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  outline: "none",
  background: "#fff",
};

const helper = { marginTop: 6, fontSize: 12, opacity: 0.65 };

const previewBox = {
  marginTop: 16,
  borderRadius: 16,
  padding: 16,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const actionsRow = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#2563eb", // biru ala tombol payroll
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const btnGhost = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 700,
};

const alertError = {
  marginBottom: 12,
  background: "#fdecea",
  border: "1px solid #f5c2c7",
  padding: 12,
  borderRadius: 12,
  color: "#842029",
};
