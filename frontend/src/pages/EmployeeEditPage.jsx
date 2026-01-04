import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { getUser, updateAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function EmployeeEditPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const user = getUser();
  const canManage = user?.role === "fat" || user?.role === "director";

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ form fields
  const [form, setForm] = useState({
    employee_code: "",
    name: "",
    department: "",
    position: "",
    status: "active",

    // private
    nik: "",
    npwp: "",
    phone: "",
    address: "",

    // bank
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
  });

  // ✅ kalau bukan FAT/DIRECTOR, lempar balik (biar aman)
  useEffect(() => {
    if (!canManage) nav("/employees", { replace: true });
  }, [canManage, nav]);

  // ✅ load data employee
  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await api(`/employees/${id}`);

        setForm((p) => ({
          ...p,
          employee_code: data.employee_code ?? "",
          name: data.name ?? "",
          department: data.department ?? "",
          position: data.position ?? "",
          status: data.status ?? "active",

          // private (kalau tidak berhak, biasanya undefined)
          nik: data.nik ?? "",
          npwp: data.npwp ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",

          bank_name: data.bank_name ?? "",
          bank_account_name: data.bank_account_name ?? "",
          bank_account_number: data.bank_account_number ?? "",
        }));
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);

    try {
      // ✅ kirim semua field (backend kamu pakai "sometimes", aman)
      await api(`/employees/${id}`, {
        method: "PUT",
        body: {
          employee_code: form.employee_code,
          name: form.name,
          department: form.department || null,
          position: form.position || null,
          status: form.status,

          nik: form.nik || null,
          npwp: form.npwp || null,
          phone: form.phone || null,
          address: form.address || null,

          bank_name: form.bank_name || null,
          bank_account_name: form.bank_account_name || null,
          bank_account_number: form.bank_account_number || null,
        },
      });

      // 🔥 SYNC HEADER DENGAN DATA TERBARU
      try {
        const me = await api("/me"); // → /api/me
        updateAuthUser({ name: me?.name, role: me?.role });
      } catch (e) {
        // fallback minimal
        updateAuthUser({ name: form.name });
      }

      nav("/employees", { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Employee</h1>
        <Button variant="outline" onClick={() => nav(-1)}>
          Back
        </Button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Form</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              {/* Basic */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm">Employee Code</label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    value={form.employee_code}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, employee_code: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Name</label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Department</label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    value={form.department}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, department: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm">Position</label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    value={form.position}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, position: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-sm">Status</label>
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, status: e.target.value }))
                    }
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <hr />

              {/* Private */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">Private Info</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm">NIK</label>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={form.nik}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nik: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm">NPWP</label>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={form.npwp}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, npwp: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-sm">Phone</label>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-sm">Address</label>
                    <textarea
                      className="w-full rounded-md border px-3 py-2"
                      rows={3}
                      value={form.address}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <hr />

              {/* Bank */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">Bank Info</div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm">Bank Name</label>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={form.bank_name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, bank_name: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm">Bank Account Name</label>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={form.bank_account_name}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          bank_account_name: e.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-sm">Bank Account Number</label>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={form.bank_account_number}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          bank_account_number: e.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => nav("/employees")}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
