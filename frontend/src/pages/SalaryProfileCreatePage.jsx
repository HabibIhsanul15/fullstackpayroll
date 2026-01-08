import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken } from "../lib/auth";

function monthToFirstDate(yyyyMM) {
  if (!yyyyMM) return "";
  if (/^\d{4}-\d{2}$/.test(yyyyMM)) return `${yyyyMM}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyyMM)) return yyyyMM;
  return "";
}

function todayMonth() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`; // YYYY-MM
}

export default function SalaryProfileCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_BASE = useMemo(
    () => import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    []
  );

  // ===== state =====
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // bulan berlaku mulai (UI) -> nanti dikirim YYYY-MM-01
  const [effectiveMonth, setEffectiveMonth] = useState(() => todayMonth());

  const [form, setForm] = useState({
    base_salary: "",
    allowance_fixed: "",
    deduction_fixed: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [serverError, setServerError] = useState("");
  const [ok, setOk] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ===== load current salary profile (berdasarkan bulan dipilih) =====
  async function loadProfile(month = effectiveMonth) {
    const token = getToken();
    setServerError("");
    setOk("");
    setLoadingProfile(true);

    try {
      const dateStr = monthToFirstDate(month);
      const url = new URL(`${API_BASE}/api/employees/${id}/salary-profile`);
      url.searchParams.set("date", dateStr);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      // 404 = belum ada profile
      if (res.status === 404) {
        setHasProfile(false);
        setIsEditing(true); // kalau belum ada, langsung boleh isi
        setForm({ base_salary: "", allowance_fixed: "", deduction_fixed: "" });
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data?.message || "Gagal memuat salary profile.");
        return;
      }

      // sukses: isi form dari profile
      setHasProfile(true);
      setIsEditing(false); // default view-only
      setForm({
        base_salary: String(data?.base_salary ?? "0"),
        allowance_fixed: String(data?.allowance_fixed ?? "0"),
        deduction_fixed: String(data?.deduction_fixed ?? "0"),
      });

      // sinkron month dari effective_from jika ada
      if (data?.effective_from && /^\d{4}-\d{2}-\d{2}$/.test(data.effective_from)) {
        setEffectiveMonth(data.effective_from.slice(0, 7));
      }
    } catch (e) {
      setServerError("Tidak bisa terhubung ke server backend.");
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // kalau user ganti bulan, coba load profile bulan itu
  useEffect(() => {
    // biar gak spam pas initial render
    if (!id) return;
    loadProfile(effectiveMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMonth]);

  async function handleSubmit(e) {
    e.preventDefault();
    const token = getToken();
    setLoading(true);
    setServerError("");
    setOk("");

    try {
      const payload = {
        base_salary: Number(form.base_salary || 0),
        allowance_fixed: Number(form.allowance_fixed || 0),
        deduction_fixed: Number(form.deduction_fixed || 0),
        effective_from: monthToFirstDate(effectiveMonth), // ✅ always YYYY-MM-01
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

      setOk("Profil gaji berhasil disimpan.");
      setHasProfile(true);
      setIsEditing(false);
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

  const isReadOnly = hasProfile && !isEditing;

  return (
    <div style={pageWrap}>
      {/* HEADER: sesuai maumu */}
      <div style={headerBar}>
        <div>
          <h1 style={title}>Atur Profil Gaji</h1>
          <p style={subtitle}>
            Berlaku mulai otomatis di tanggal 01 (per bulan).
            {hasProfile ? " Klik Edit untuk mengubah." : " Silakan isi lalu simpan."}
          </p>
        </div>

        {/* kanan atas: kalau sudah ada -> hanya EDIT.
           kalau belum ada -> tampil tombol SIMPAN */}
        <div style={{ display: "flex", gap: 10 }}>
          {hasProfile ? (
            <button
              type="button"
              style={btnPrimary}
              onClick={() => {
                setServerError("");
                setOk("");
                setIsEditing(true);
              }}
              disabled={loadingProfile || loading}
            >
              Edit
            </button>
          ) : (
            <button
              type="submit"
              form="salaryProfileForm"
              style={btnPrimary}
              disabled={loadingProfile || loading}
            >
              {loading ? "Menyimpan..." : "Simpan Profil Gaji"}
            </button>
          )}
        </div>
      </div>

      {serverError && (
        <div style={alertError}>
          <b>Gagal:</b> {serverError}
        </div>
      )}
      {ok && (
        <div style={alertOk}>
          <b>OK:</b> {ok}
        </div>
      )}

      <div style={card}>
        <div style={cardHeader}>
          <div>
            <div style={cardTitle}>Profil Gaji</div>
            <div style={cardDesc}>
              Salary profile akan dipakai saat generate payroll (per bulan).
            </div>
          </div>

          {hasProfile ? <div style={pill}>Sudah Ada</div> : <div style={pillWarn}>Belum Ada</div>}
        </div>

        {loadingProfile ? (
          <div style={{ marginTop: 14, opacity: 0.7 }}>Memuat data...</div>
        ) : (
          <form id="salaryProfileForm" onSubmit={handleSubmit} style={{ marginTop: 14 }}>
            <div style={grid2}>
              <Field
                label="Gaji Pokok"
                placeholder="contoh: 5000000"
                value={form.base_salary}
                onChange={(v) => setField("base_salary", v)}
                disabled={isReadOnly}
              />
              <Field
                label="Tunjangan Tetap"
                placeholder="contoh: 500000"
                value={form.allowance_fixed}
                onChange={(v) => setField("allowance_fixed", v)}
                disabled={isReadOnly}
              />
              <Field
                label="Potongan Tetap"
                placeholder="contoh: 200000"
                value={form.deduction_fixed}
                onChange={(v) => setField("deduction_fixed", v)}
                disabled={isReadOnly}
              />

              <div>
                <label style={label}>Berlaku Mulai (Bulan)</label>
                <input
                  type="month"
                  value={effectiveMonth}
                  onChange={(e) => setEffectiveMonth(e.target.value)}
                  style={input}
                  disabled={isReadOnly}
                />
                <div style={helper}>
                  Dikirim ke backend sebagai: {monthToFirstDate(effectiveMonth) || "-"}
                </div>
              </div>
            </div>

            <div style={previewBox}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Total (preview)</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                {formatIDR(totalPreview)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Total = gaji pokok + tunjangan − potongan
              </div>
            </div>

            {/* AKSI BAWAH: sesuai maumu */}
            <div style={actionsRow}>
              <button
                type="button"
                style={btnGhost}
                onClick={() => navigate("/employees")}
                disabled={loading}
              >
                Ke Employees
              </button>

              {/* tombol simpan hanya muncul saat:
                  - belum ada profile (create), atau
                  - sudah ada & user klik edit (update via create record baru effective_from) */}
              {(!hasProfile || isEditing) && (
                <button type="submit" style={btnPrimary} disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan Profil Gaji"}
                </button>
              )}

              {/* saat mode edit, kasih cancel supaya balik read-only */}
              {hasProfile && isEditing && (
                <button
                  type="button"
                  style={btnGhost}
                  disabled={loading}
                  onClick={() => {
                    setIsEditing(false);
                    setServerError("");
                    setOk("");
                    // reload supaya balik ke nilai tersimpan
                    loadProfile(effectiveMonth);
                  }}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */
function Field({ label: labelText, placeholder, value, onChange, disabled }) {
  return (
    <div>
      <label style={label}>{labelText}</label>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...input,
          background: disabled ? "#f8fafc" : "#fff",
          cursor: disabled ? "not-allowed" : "text",
        }}
        disabled={disabled}
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

const pillWarn = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#92400e",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const label = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
  color: "#111827",
};

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
  flexWrap: "wrap",
};

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#2563eb",
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

const alertOk = {
  marginBottom: 12,
  background: "#ecfdf5",
  border: "1px solid #a7f3d0",
  padding: 12,
  borderRadius: 12,
  color: "#065f46",
};
