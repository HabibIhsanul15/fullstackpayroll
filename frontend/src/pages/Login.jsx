import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("staff@test.com");
  const [password, setPassword] = useState("password123");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const eEmail = String(email || "").trim();
    const ePass = String(password || "");

    if (!eEmail || !ePass) {
      setErr("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const data = await api("/login", {
        method: "POST",
        body: { email: eEmail, password: ePass },
      });

      if (!data?.token) {
        throw new Error("Login berhasil namun token tidak ditemukan.");
      }

      saveAuth(data.token, data.user);
      nav("/payrolls", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  const label = "text-[11px] font-semibold text-slate-700";
  const input =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-200/60 disabled:opacity-60";

  const Chip = ({ children }) => (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {children}
    </div>
  );

  const Mini = ({ title, desc }) => (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-[12px] text-white/80 leading-relaxed">{desc}</div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* ===================== LEFT (cute & elegan) ===================== */}
        <section className="relative overflow-hidden px-8 py-10 lg:px-12 lg:py-12 text-white">
          {/* soft pastel gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.95),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.85),transparent_50%),linear-gradient(135deg,rgba(2,132,199,0.90),rgba(79,70,229,0.88))]" />

          {/* cute blobs */}
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          {/* subtle sparkle dots */}
          <div className="absolute inset-0 opacity-[0.20] bg-[radial-gradient(circle,rgba(255,255,255,0.55)_1px,transparent_1px)] bg-[length:22px_22px]" />

          <div className="relative h-full flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-white" />
                <span className="text-sm font-semibold">Human Plus Institute</span>
              </div>

              <h1 className="mt-10 text-[40px] font-black leading-tight tracking-tight">
                Payroll
                <span className="block text-white/90">Internal System</span>
              </h1>

              <p className="mt-4 max-w-md text-white/90 leading-relaxed">
                Sistem internal untuk pengelolaan proses penggajian karyawan secara
                terpusat dan terkontrol.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Chip>Komponen gaji</Chip>
                <Chip>Periode payroll</Chip>
                <Chip>Monitoring proses</Chip>
                <Chip>Informasi gaji</Chip>
              </div>

              {/* mini blocks, bukan card gede */}
              <div className="mt-8 grid max-w-md grid-cols-1 sm:grid-cols-2 gap-3">
                <Mini title="Perhitungan Payroll" desc="Perhitungan gaji dilakukan berdasarkan komponen yang telah ditetapkan." />
                <Mini title="Kebutuhan Internal" desc="Informasi gaji digunakan untuk keperluan internal institute." />
              </div>

              <p className="mt-6 max-w-md text-[12px] text-white/75 leading-relaxed">
                Akses hanya untuk pengguna yang memiliki akun dan kewenangan yang sesuai.
              </p>
            </div>

            <div className="text-xs text-white/70">
              © {new Date().getFullYear()} Human Plus Institute
            </div>
          </div>
        </section>

        {/* ===================== RIGHT ===================== */}
        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">Login</div>
              <Link
                to="/register"
                className="text-sm font-semibold text-sky-700 hover:underline"
              >
                Register Staff →
              </Link>
            </div>

            <h2 className="mt-3 text-3xl font-black text-slate-900">Login Payroll</h2>
            <p className="mt-1 text-sm text-slate-600">
              Silakan masuk menggunakan akun staff yang terdaftar.
            </p>

            {err && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {err}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <div className={label}>Email</div>
                <input
                  className={input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@humanplus.id"
                  type="email"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className={label}>Password</div>
                <input
                  className={`${input} focus:border-indigo-400 focus:ring-indigo-200/60`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Loading..." : "Login"}
              </button>

              <div className="text-center text-xs text-slate-500">
                Belum memiliki akun?{" "}
                <Link to="/register" className="font-semibold text-sky-700 hover:underline">
                  Register Staff
                </Link>
              </div>

              <div className="pt-2 text-center text-[11px] text-slate-400">
                © {new Date().getFullYear()} Human Plus Institute — Internal System
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
