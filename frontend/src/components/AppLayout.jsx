import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUser, isAuthed, clearAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";

function menuByRole(role) {
  // ✅ My Profile selalu ada untuk semua role
  const base = [
    { to: "/payrolls", label: "Payroll" },
    { to: "/my-profile", label: "My Profile" },
  ];

  // ✅ FAT / Director dapat menu tambahan
  if (role === "fat" || role === "director") {
    return [
      { to: "/payrolls", label: "Payroll" },
      { to: "/employees", label: "Employees" },
      { to: "/accounts/create", label: "Create Account" },
      { to: "/my-profile", label: "My Profile" },
    ];
  }

  // ✅ Staff / role lain
  return base;
}

function roleLabel(role) {
  return (
    {
      fat: "Finance Admin",
      director: "Director",
      staff: "Staff",
      employee: "Staff",
      admin: "Admin",
    }[role] || role || "-"
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => getUser());
  const [booting, setBooting] = useState(true);

  // sync user dari localStorage
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener("auth:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // ✅ boot logic: jangan clearAuth kalau token ada tapi user masih null
  useEffect(() => {
    if (!isAuthed()) {
      setBooting(false);
      clearAuth();
      navigate("/login", { replace: true });
      return;
    }

    // token ada, user belum kebaca → tunggu
    if (!user) return;

    setBooting(false);
  }, [navigate, user]);

  const menus = useMemo(() => menuByRole(user?.role), [user?.role]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  // ✅ Loading screen saat refresh (menghindari putih)
  if (booting || (isAuthed() && !user)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-800">Loading...</div>
          <div className="text-xs text-slate-500 mt-1">Menyiapkan sesi login</div>
        </div>
      </div>
    );
  }

  // safety
  if (!isAuthed() || !user) return null;

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* sticky header */}
      <header className="sticky top-0 z-50 border-b bg-white/70 supports-[backdrop-filter]:bg-white/60 backdrop-blur shadow-sm">
        <div className="w-full px-6 h-14 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span className="text-sm font-semibold text-slate-800">Payroll App</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              <span className="font-semibold text-slate-900">{user?.name ?? "-"}</span>{" "}
              • <span>{roleLabel(user?.role)}</span>
            </span>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* content */}
      <div className="w-full px-6 py-6">
        <div className="flex gap-6">
          {/* sidebar */}
          <aside className="w-[260px] shrink-0">
            <div className="sticky top-[calc(56px+24px)]">
              <div className="rounded-3xl border border-slate-200 bg-white/75 backdrop-blur shadow-[0_16px_50px_rgba(2,6,23,0.06)] overflow-hidden h-[calc(100vh-56px-48px)] flex flex-col">
                <div className="px-5 py-4 border-b border-slate-200/70 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Menu</span>
                  <span className="text-xs text-slate-500">{roleLabel(user?.role)}</span>
                </div>

                <nav className="p-3 space-y-2 flex-1 overflow-auto">
                  {menus.map((m) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      className={[
                        "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition",
                        isActive(m.to)
                          ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
                      ].join(" ")}
                    >
                      <span>{m.label}</span>
                      <span
                        className={[
                          "text-xs",
                          isActive(m.to)
                            ? "text-white/90"
                            : "text-slate-400 group-hover:text-slate-600",
                        ].join(" ")}
                      >
                        →
                      </span>
                    </Link>
                  ))}
                </nav>

                <div className="p-4 mt-auto">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-600 leading-relaxed">
                    <div className="font-semibold text-slate-800 mb-1">Payroll Internal</div>
                    Modul ini digunakan untuk proses penggajian karyawan dan bersifat internal.
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* main */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
