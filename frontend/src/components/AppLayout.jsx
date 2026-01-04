import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUser, isAuthed, clearAuth } from "@/lib/auth";
import { useEffect, useMemo } from "react";

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

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser(); // object atau null

  useEffect(() => {
    if (!isAuthed() || !user) {
      clearAuth();
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const menus = useMemo(() => menuByRole(user?.role), [user?.role]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  if (!isAuthed() || !user) return null;

  const isActive = (to) => {
    // aktif kalau exact, atau nested route (misal /employees/1/edit)
    return location.pathname === to || location.pathname.startsWith(to + "/");
  };

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
