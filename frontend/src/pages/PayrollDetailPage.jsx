import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchPayrollDetail } from "@/lib/payrollsApi";
import { getToken } from "@/lib/auth";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(n || 0));

export default function PayrollDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // ✅ fungsi ini TARUH DI SINI (bukan di useEffect)
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
      .then((data) => mounted && setRow(data))
      .catch((e) => mounted && setErr(e?.message || "Gagal memuat detail."))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-4">Loading slip gaji...</div>;

  if (err) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">{err}</div>
        <button className="btn btn-secondary" onClick={() => nav(-1)}>
          Kembali
        </button>
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="mb-1">Slip Gaji</h3>
          <div className="text-muted">Periode: {row.periode || "-"}</div>
        </div>

        <div className="d-flex gap-2">
          {/* ✅ Tombol PDF */}
          <button
            className="btn btn-outline-primary"
            onClick={() => openPayrollPdf(row.id)}
            disabled={row.masked || pdfLoading}
            title={row.masked ? "Tidak punya akses melihat nominal" : "Buka PDF di tab baru"}
          >
            {pdfLoading ? "Membuka PDF..." : "Buka PDF (Print)"}
          </button>

          <button className="btn btn-outline-secondary" onClick={() => nav(-1)}>
            Kembali
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h5 className="mb-3">Informasi Karyawan</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="text-muted small">Nama</div>
              <div className="fw-semibold">{row.employee_name || "-"}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small">Kode</div>
              <div className="fw-semibold">{row.employee_code || "-"}</div>
            </div>
            <div className="col-md-3">
              <div className="text-muted small">Status</div>
              <div
                className={`fw-semibold ${
                  row.employee_status === "inactive" ? "text-danger" : "text-success"
                }`}
              >
                {row.employee_status || "-"}
              </div>
            </div>
            <div className="col-md-6">
              <div className="text-muted small">Dibuat oleh</div>
              <div className="fw-semibold">{row.created_by || "-"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="mb-3">Rincian Gaji</h5>

          {row.masked ? (
            <div className="alert alert-warning mb-0">
              Kamu tidak memiliki akses untuk melihat nominal gaji.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <tbody>
                  <tr>
                    <td className="text-muted">Gaji Pokok</td>
                    <td className="text-end fw-semibold">{rupiah(row.gaji_pokok)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Tunjangan</td>
                    <td className="text-end fw-semibold">{rupiah(row.tunjangan)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Potongan</td>
                    <td className="text-end fw-semibold">{rupiah(row.potongan)}</td>
                  </tr>
                  <tr className="table-light">
                    <td className="fw-bold">Total</td>
                    <td className="text-end fw-bold">{rupiah(row.total)}</td>
                  </tr>
                </tbody>
              </table>

              {row.catatan ? (
                <div className="mt-2">
                  <div className="text-muted small">Catatan</div>
                  <div>{row.catatan}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
