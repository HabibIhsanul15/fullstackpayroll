import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../lib/auth";

export default function SalaryProfileCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_BASE = useMemo(() => import.meta.env.VITE_API_URL || "http://127.0.0.1:8000", []);

  const [form, setForm] = useState({
    base_salary: "",
    allowance_fixed: 0,
    deduction_fixed: 0,
    effective_from: new Date().toISOString().slice(0, 10),
  });

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const token = getToken();
    setLoading(true);
    setServerError("");

    try {
      const payload = {
        ...form,
        base_salary: Number(form.base_salary),
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
        setServerError(data?.message || "Gagal menyimpan salary profile.");
        return;
      }

      navigate("/employees");
    } catch (err) {
      setServerError("Tidak bisa terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <h2>Set Salary Profile</h2>
      <p style={{ opacity: 0.7 }}>Isi struktur gaji untuk employee ini.</p>

      {serverError && <div style={{ background: "#fdecea", padding: 12, borderRadius: 10 }}>{serverError}</div>}

      <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #eee" }}>
        <label>Base Salary</label>
        <input value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} style={inputStyle} />

        <label>Allowance Fixed</label>
        <input value={form.allowance_fixed} onChange={(e) => setForm({ ...form, allowance_fixed: e.target.value })} style={inputStyle} />

        <label>Deduction Fixed</label>
        <input value={form.deduction_fixed} onChange={(e) => setForm({ ...form, deduction_fixed: e.target.value })} style={inputStyle} />

        <label>Effective From</label>
        <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} style={inputStyle} />

        <button disabled={loading} style={btnPrimary}>{loading ? "Saving..." : "Save Salary Profile"}</button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", margin: "6px 0 12px" };
const btnPrimary = { padding: "10px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" };
