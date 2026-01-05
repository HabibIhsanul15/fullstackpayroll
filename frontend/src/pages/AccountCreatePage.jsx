import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getUser, isAuthed } from "@/lib/auth";
import { createAdminUser } from "@/lib/adminUsersApi";

const ALLOWED = ["fat", "director"];

const DEFAULT_FORM = {
  name: "",
  email: "",
  role: "fat",
  password: "",
  password_confirmation: "",
};

export default function AccountCreatePage() {
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("auth:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ✅ tunggu user kebaca saat refresh (biar ga “putih” / redirect salah)
  if (isAuthed() && !user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm max-w-2xl">
          <div className="text-sm font-semibold text-slate-800">Loading...</div>
          <div className="text-xs text-slate-500 mt-1">Menyiapkan sesi akun</div>
        </div>
      </div>
    );
  }

  const allowed = useMemo(() => ALLOWED.includes(user?.role), [user?.role]);
  if (!allowed) return <Navigate to="/payrolls" replace />;

  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [createdUser, setCreatedUser] = useState(null);

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function reset() {
    setForm(DEFAULT_FORM);
    setErr("");
    setOk("");
    setCreatedUser(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setCreatedUser(null);

    if (!form.name.trim()) return setErr("Nama wajib diisi.");
    if (!form.email.trim()) return setErr("Email wajib diisi.");
    if (form.password.length < 8) return setErr("Password minimal 8 karakter.");
    if (form.password !== form.password_confirmation) return setErr("Konfirmasi password tidak sama.");

    setSubmitting(true);
    try {
      const res = await createAdminUser({
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      setCreatedUser(res?.user || null);
      setOk(res?.message || "Akun berhasil dibuat.");
      setForm((p) => ({ ...p, password: "", password_confirmation: "" }));
    } catch (e2) {
      setErr(e2?.message || "Gagal membuat akun.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="text-3xl font-black text-slate-900">Create Account</div>
        <div className="text-slate-500 mt-1">
          Buat akun <b>FAT</b> / <b>Director</b> dari menu internal (tanpa register publik).
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-[0_16px_50px_rgba(2,6,23,0.06)] p-5 max-w-3xl">
        {err && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            {err}
          </div>
        )}
        {ok && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">
            {ok}
          </div>
        )}

        {!createdUser ? (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">Nama</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Nama akun"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">Role</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) => setField("role", e.target.value)}
                >
                  <option value="fat">Finance Admin (FAT)</option>
                  <option value="director">Director</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-2">Email</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="email@company.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Minimal 8 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">Konfirmasi Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={form.password_confirmation}
                  onChange={(e) => setField("password_confirmation", e.target.value)}
                  placeholder="Ulangi password"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
                disabled={submitting}
              >
                Reset
              </button>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        ) : (
          <div className="max-w-2xl">
            <div className="text-lg font-black text-slate-900">Akun dibuat ✅</div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm">Nama: <b>{createdUser.name}</b></div>
              <div className="text-sm mt-1">Email: <b>{createdUser.email}</b></div>
              <div className="text-sm mt-1">Role: <b>{createdUser.role}</b></div>

              <div className="text-xs text-slate-500 mt-3">
                Password tidak ditampilkan demi keamanan (karena kamu input sendiri).
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                onClick={reset}
              >
                Buat Akun Lagi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
