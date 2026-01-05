import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

function toNumber(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatIDR(n) {
  const num = toNumber(n);
  try {
    return new Intl.NumberFormat("id-ID").format(num);
  } catch {
    return String(num);
  }
}

export default function PayrollEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = getUser();
  const canManage = user?.role === "fat" || user?.role === "director";

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    periode: "",
    gaji_pokok: "",
    tunjangan: "",
    potongan: "",
    catatan: "",
  });

  // staff ga boleh edit → balik
  useEffect(() => {
    if (!canManage) {
      nav("/payrolls", { replace: true });
    }
  }, [canManage, nav]);

  useEffect(() => {
    (async () => {
      setErr("");
      setOk("");
      setLoading(true);
      try {
        const data = await api(`/payrolls/${id}`);
        const p = data?.data ?? data;

        setForm({
          periode: p?.periode ?? "",
          gaji_pokok: p?.gaji_pokok ?? "",
          tunjangan: p?.tunjangan ?? "",
          potongan: p?.potongan ?? "",
          catatan: p?.catatan ?? "",
        });
      } catch (e) {
        setErr(e?.message || "Gagal memuat data payroll.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const totalPreview = useMemo(() => {
    const gaji = toNumber(form.gaji_pokok);
    const tunj = toNumber(form.tunjangan);
    const pot = toNumber(form.potongan);
    return gaji + tunj - pot;
  }, [form.gaji_pokok, form.tunjangan, form.potongan]);

  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);

    try {
      const payload = {
        periode: form.periode,
        gaji_pokok: toNumber(form.gaji_pokok),
        tunjangan: form.tunjangan === "" ? null : toNumber(form.tunjangan),
        potongan: form.potongan === "" ? null : toNumber(form.potongan),
        catatan: form.catatan === "" ? null : form.catatan,
      };

      await api(`/payrolls/${id}`, { method: "PUT", body: payload });
      setOk("Perubahan payroll berhasil disimpan.");
      // biar keliatan sukses sebentar, lalu balik
      setTimeout(() => nav("/payrolls", { replace: true }), 650);
    } catch (e) {
      setErr(e?.message || "Gagal menyimpan perubahan payroll.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      {/* Soft background (selaras PayrollList/Login/Register) */}
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
              Edit Payroll
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Perbarui komponen gaji dan simpan perubahan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => nav(-1)}
              className="rounded-2xl bg-white/70 backdrop-blur border-slate-200 hover:bg-white"
              disabled={saving}
            >
              Back
            </Button>

            <Button
              type="submit"
              form="payroll-edit-form"
              disabled={saving || loading}
              className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {err}
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
              <div className="text-sm font-semibold text-slate-900">Form Payroll</div>
              <div className="text-xs text-slate-500">
                Isi gaji pokok, tunjangan, potongan, dan catatan bila diperlukan.
              </div>
            </div>

            <div className="text-xs text-slate-500">
              ID: <span className="font-semibold text-slate-700">{id}</span>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <form id="payroll-edit-form" onSubmit={submit} className="space-y-5">
                {/* Periode */}
                <div>
                  <label className="text-sm font-semibold text-slate-800">Periode</label>
                  <div className="mt-2">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                      type="date"
                      value={form.periode}
                      onChange={onChange("periode")}
                      required
                    />
                  </div>
                </div>

                {/* Gaji Pokok */}
                <div>
                  <label className="text-sm font-semibold text-slate-800">Gaji Pokok</label>
                  <div className="mt-2">
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                      type="number"
                      min="0"
                      step="1"
                      value={form.gaji_pokok}
                      onChange={onChange("gaji_pokok")}
                      placeholder="0"
                      required
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Format tampilan: <span className="font-semibold">Rp {formatIDR(form.gaji_pokok)}</span>
                    </div>
                  </div>
                </div>

                {/* Tunjangan & Potongan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-800">Tunjangan</label>
                    <div className="mt-2">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                        type="number"
                        min="0"
                        step="1"
                        value={form.tunjangan}
                        onChange={onChange("tunjangan")}
                        placeholder="0"
                      />
                      <div className="mt-1 text-xs text-slate-500">
                        Rp {formatIDR(form.tunjangan)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-800">Potongan</label>
                    <div className="mt-2">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-200/40"
                        type="number"
                        min="0"
                        step="1"
                        value={form.potongan}
                        onChange={onChange("potongan")}
                        placeholder="0"
                      />
                      <div className="mt-1 text-xs text-slate-500">
                        Rp {formatIDR(form.potongan)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="text-sm font-semibold text-slate-800">Catatan</label>
                  <div className="mt-2">
                    <textarea
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-200/40"
                      rows={4}
                      value={form.catatan}
                      onChange={onChange("catatan")}
                      placeholder="Opsional"
                    />
                  </div>
                </div>

                {/* Total Preview */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total (preview)</span>
                    <span className="text-base font-extrabold text-slate-900">
                      Rp {formatIDR(totalPreview)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Total dihitung otomatis dari gaji pokok + tunjangan − potongan.
                  </p>
                </div>

                {/* Footer actions (optional, kalau mau tombol di bawah juga) */}
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => nav(-1)}
                    className="rounded-2xl bg-white border-slate-200 hover:bg-slate-50"
                    disabled={saving}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-extrabold hover:brightness-110"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
          <span>© {new Date().getFullYear()} Human Plus Institute</span>
          <span>Payroll Internal System</span>
        </div>
      </div>
    </div>
  );
}
