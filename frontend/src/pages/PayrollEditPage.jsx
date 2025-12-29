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

export default function PayrollEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = getUser();
  const canManage = user?.role === "fat" || user?.role === "director";

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    periode: "",
    gaji_pokok: "",
    tunjangan: "",
    potongan: "",
    catatan: "",
  });

  // ✅ staff ga boleh edit → lempar balik
  useEffect(() => {
    if (!canManage) {
      nav("/payrolls", { replace: true });
    }
  }, [canManage, nav]);

  useEffect(() => {
    (async () => {
      setErr("");
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
        setErr(e.message);
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

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
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
      nav("/payrolls", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Payroll</h1>
        <Button variant="outline" onClick={() => nav(-1)}>
          Back
        </Button>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-sm">Periode</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                type="date"
                value={form.periode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, periode: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Gaji Pokok</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                type="number"
                min="0"
                step="1"
                value={form.gaji_pokok}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gaji_pokok: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm">Tunjangan</label>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  type="number"
                  min="0"
                  step="1"
                  value={form.tunjangan}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, tunjangan: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm">Potongan</label>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  type="number"
                  min="0"
                  step="1"
                  value={form.potongan}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, potongan: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Catatan</label>
              <textarea
                className="w-full rounded-md border px-3 py-2"
                rows={3}
                value={form.catatan}
                onChange={(e) =>
                  setForm((p) => ({ ...p, catatan: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total (preview)</span>
                <span className="font-semibold">{totalPreview}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Total akan dihitung ulang otomatis oleh sistem saat disimpan.
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
