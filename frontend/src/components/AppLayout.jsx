import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUser, isAuthed, clearAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { updateAuthUser } from "@/lib/auth";


function menuByRole(role) {
  const base = [{ to: "/payrolls", label: "Payroll" }];

  if (role !== "fat" && role !== "director") {
    base.push({ to: "/my-profile", label: "My Profile" });
  }

  if (role === "fat" || role === "director") {
    return [
      ...base,
      { to: "/payrolls/new", label: "Create Payroll" },
      { to: "/employees", label: "Employees" },
    ];
  }

  return base;
}

function roleLabel(role) {
  return (
    {
      fat: "Finance Admin",
      director: "Director",
      staff: "Staff",
      admin: "Admin",
    }[role] || role || "-"
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ JADI STATE biar rerender saat berubah
  const [user, setUser] = useState(() => getUser());

  // ✅ sinkron saat login/logout (custom event) + multi tab (storage)
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("auth:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ✅ guard
  useEffect(() => {
    if (!isAuthed() || !user) {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }, [navigate, user]);

    // ✅ auto-sync data user dari backend saat pindah halaman
  useEffect(() => {
    if (!isAuthed()) return;

    (async () => {
      try {
        const me = await api("/me"); // -> /api/me
        updateAuthUser({ name: me?.name, role: me?.role, email: me?.email });
      } catch {
        // ignore
      }
    })();
  }, [location.pathname]);


  const menus = useMemo(() => menuByRole(user?.role), [user?.role]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  if (!isAuthed() || !user) return null;

  const isActive = (to) => {
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">Payroll App</div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{user?.name ?? "-"}</span>
              {" "}•{" "}
              <span>{roleLabel(user?.role)}</span>
            </span>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-3">
          <nav className="space-y-1">
            {menus.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className={[
                  "block rounded-lg border px-3 py-2 hover:bg-accent",
                  isActive(m.to) ? "bg-accent font-medium" : "",
                ].join(" ")}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
