import { Link, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUser, isAuthed, clearAuth } from "@/lib/auth";
import { useEffect, useMemo } from "react";

function menuByRole(role) {
  const base = [{ to: "/payrolls", label: "Payroll" }];

  if (role === "fat" || role === "director") {
    return [
      ...base,
      { to: "/payrolls/new", label: "Create Payroll" },
      { to: "/employees", label: "Employees" },
    ];
  }

  return base;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const user = getUser(); // object atau null

  // kalau token/user gak ada, jangan biarin layout tampil
  useEffect(() => {
    if (!isAuthed() || !user) {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }, [navigate]); // sengaja ga masukin user biar gak rerun terus

  const menus = useMemo(() => menuByRole(user?.role), [user?.role]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  // saat redirect, jangan render apa-apa (hindari flicker + fetch)
  if (!isAuthed() || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="font-semibold">Payroll App</div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {user?.name} • {user?.role}
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
                className="block rounded-lg border px-3 py-2 hover:bg-accent"
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
