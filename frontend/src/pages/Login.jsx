import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    setLoading(true);

    try {
      const data = await api("/login", {
        method: "POST",
        body: { email, password },
      });

      // pastikan field ini ada
      if (!data?.token) throw new Error("Login berhasil tapi token tidak ada di response.");

      saveAuth(data.token, data.user);

      nav("/payrolls", { replace: true });
    } catch (e) {
      setErr(e?.message || "Login gagal");
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
        />

        <input
          className="w-full border rounded-lg px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
        />

        <button
          disabled={loading}
          className="w-full bg-black text-white rounded-lg py-2 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        {err && <div className="text-red-600 text-sm">{err}</div>}
      </form>
    </div>
  );
}
