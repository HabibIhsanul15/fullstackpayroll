import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerStaff } from "@/lib/authApi";

export default function Register() {
  const nav = useNavigate();

  // Step 1 (wajib)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  // Step 2 (wajib)
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  // Step 3 (opsional)
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // untuk nampilin error validasi per-field (kalau backend kirim errors)
  const [fieldErrs, setFieldErrs] = useState({});

  const isRequiredFilled = useMemo(() => {
    return (
      name.trim() &&
      email.trim() &&
      password.trim() &&
      passwordConfirmation.trim() &&
      department.trim() &&
      position.trim()
    );
  }, [name, email, password, passwordConfirmation, department, position]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setFieldErrs({});
    setLoading(true);

    try {
      await registerStaff({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        department,
        position,
        address: address.trim() ? address : null, // opsional
      });

      alert("Register berhasil. Silakan login.");
      nav("/login", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Register gagal");

      // kalau backend kirim errors laravel, simpan untuk ditampilkan
      const errors = e2?.payload?.errors;
      if (errors && typeof errors === "object") {
        const mapped = {};
        Object.keys(errors).forEach((k) => {
          mapped[k] = Array.isArray(errors[k]) ? errors[k].join(" ") : String(errors[k]);
        });
        setFieldErrs(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black/20";
  const labelClass = "text-xs text-muted-foreground";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-[720px] border rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Register Staff</h1>
          </div>

          <Link to="/login" className="text-sm underline">
            Back to Login
          </Link>
        </div>

        {/* Step 1: Akun */}
        <div className="space-y-3">
          <div className="font-semibold">Akun</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className={labelClass}>Nama Lengkap</div>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
              />
              {fieldErrs.name && <div className="text-sm text-red-600">{fieldErrs.name}</div>}
            </div>

            <div className="space-y-1">
              <div className={labelClass}>Email</div>
              <input
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                type="email"
              />
              {fieldErrs.email && <div className="text-sm text-red-600">{fieldErrs.email}</div>}
            </div>

            <div className="space-y-1">
              <div className={labelClass}>Password (min 8, wajib)</div>
              <input
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
              />
              {fieldErrs.password && <div className="text-sm text-red-600">{fieldErrs.password}</div>}
            </div>

            <div className="space-y-1">
              <div className={labelClass}>Konfirmasi Password (wajib)</div>
              <input
                className={inputClass}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Ulangi password"
                type="password"
              />
              {fieldErrs.password_confirmation && (
                <div className="text-sm text-red-600">{fieldErrs.password_confirmation}</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Pekerjaan */}
        <div className="space-y-3">
          <div className="font-semibold">Pekerjaan</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className={labelClass}>Department (wajib)</div>
              <input
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Contoh: Finance / HR / IT"
              />
              {fieldErrs.department && (
                <div className="text-sm text-red-600">{fieldErrs.department}</div>
              )}
            </div>

            <div className="space-y-1">
              <div className={labelClass}>Position (wajib)</div>
              <input
                className={inputClass}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Contoh: Staff / Supervisor"
              />
              {fieldErrs.position && (
                <div className="text-sm text-red-600">{fieldErrs.position}</div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Opsional */}
        <div className="space-y-3">
          <div className="font-semibold">Opsional</div>

          <div className="space-y-1">
            <div className={labelClass}>Alamat (opsional)</div>
            <textarea
              className={`${inputClass} min-h-[90px]`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap (boleh dikosongkan)"
            />
            {fieldErrs.address && <div className="text-sm text-red-600">{fieldErrs.address}</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3">
          <button
            disabled={loading || !isRequiredFilled}
            className="w-full bg-black text-white rounded-lg py-2 disabled:opacity-60"
            title={!isRequiredFilled ? "Lengkapi field wajib (Step 1 & 2)" : ""}
          >
            {loading ? "Loading..." : "Register (Staff)"}
          </button>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="text-xs text-muted-foreground">
            Catatan: role otomatis dibuat sebagai <b>staff</b>. FAT/Direktur tidak bisa register dari sini.
          </div>
        </div>
      </form>
    </div>
  );
}
