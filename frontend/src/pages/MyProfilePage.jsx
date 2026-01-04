import { useEffect, useState } from "react";
import { fetchMeEmployee, updateMeEmployee } from "@/lib/meApi";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function MyProfilePage() {
  const user = getUser();
  const isStaff = user?.role === "staff" || user?.role === "employee";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    nik: "",
    npwp: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
  });

  const [meta, setMeta] = useState({
    employee_code: "",
    department: "",
    position: "",
    status: "",
  });

  useEffect(() => {
    let mounted = true;

    // ✅ kalau bukan staff, tidak perlu fetch employee
    if (!isStaff) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");
    fetchMeEmployee()
      .then((emp) => {
        if (!mounted) return;

        setMeta({
          employee_code: emp.employee_code || "",
          department: emp.department || "",
          position: emp.position || "",
          status: emp.status || "",
        });

        setForm({
          name: emp.name || "",
          phone: emp.phone || "",
          address: emp.address || "",
          nik: emp.nik || "",
          npwp: emp.npwp || "",
          bank_name: emp.bank_name || "",
          bank_account_name: emp.bank_account_name || "",
          bank_account_number: emp.bank_account_number || "",
        });
      })
      .catch((e) => mounted && setErr(e.message))
      .finally(() => mounted && setLoading(false));

    return () => (mounted = false);
  }, [isStaff]);

  const onChange = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSave = async () => {
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const res = await updateMeEmployee(form);
      setOk(res?.message || "Berhasil disimpan.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading profil...</div>;

  // ✅ Tampilan untuk FAT/Direktur
  if (!isStaff) {
    return (
      <div className="p-4 space-y-3 max-w-3xl">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Halaman ini menampilkan informasi akun yang sedang login.
        </p>

        <div className="rounded-lg border p-4 space-y-3">
          <Field label="Nama" value={user?.name} />
          <Field label="Role" value={user?.role} />
          <Field label="Email" value={user?.email ?? "-"} />
        </div>

        <div className="text-sm text-muted-foreground">
          Untuk role <b>{user?.role}</b>, data pegawai (NIK/Bank/NPWP) tidak perlu diisi.
        </div>
      </div>
    );
  }

  // ✅ Tampilan untuk Staff (form employee)
  return (
    <div className="p-4 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Lengkapi data pribadi & rekening untuk kebutuhan slip gaji.
          </p>
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {ok && <div className="text-sm text-green-700">{ok}</div>}

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-semibold">Info Karyawan (read-only)</div>
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="Employee Code" value={meta.employee_code} />
          <Field label="Department" value={meta.department} />
          <Field label="Position" value={meta.position} />
          <Field label="Status" value={meta.status || "-"} />
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="font-semibold">Private / Sensitive Info</div>

        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Nama" value={form.name} onChange={onChange("name")} />
          <Input label="Phone" value={form.phone} onChange={onChange("phone")} />
          <Input label="NIK" value={form.nik} onChange={onChange("nik")} />
          <Input label="NPWP" value={form.npwp} onChange={onChange("npwp")} />
          <Input label="Bank Name" value={form.bank_name} onChange={onChange("bank_name")} />
          <Input label="Bank Account Name" value={form.bank_account_name} onChange={onChange("bank_account_name")} />
          <Input label="Bank Account Number" value={form.bank_account_number} onChange={onChange("bank_account_number")} />
          <Textarea label="Address" value={form.address} onChange={onChange("address")} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "-"}</div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <input {...props} className="w-full rounded-md border px-3 py-2 text-sm" />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div className="space-y-1 md:col-span-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <textarea {...props} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
    </div>
  );
}
