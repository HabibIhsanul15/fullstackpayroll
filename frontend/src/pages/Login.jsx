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

      if (!data?.token) throw new Error("Login berhasil tapi token tidak ada di response.");

      // ✅ simpan token + user (pastikan backend kirim employee_id juga)
      saveAuth(data.token, data.user);

      nav("/payrolls", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-[420px] border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Login Payroll</h1>

        <input
          className="w-full border rounded-lg px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          type="email"
          autoComplete="email"
          disabled={loading}
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          autoComplete="current-password"
          disabled={loading}
        />

        <button
          disabled={loading}
          className="w-full bg-black text-white rounded-lg py-2 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        {/* ✅ tombol register staff */}
        <Link
          to="/register"
          className={`block w-full text-center border rounded-lg py-2 hover:bg-accent ${
            loading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Register Staff
        </Link>

        {err && <div className="text-red-600 text-sm">{err}</div>}
      </form>
    </div>
  );
}
