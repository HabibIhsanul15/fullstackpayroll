import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthed } from "./lib/auth";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import PayrollList from "./pages/PayrollList";
import PayrollCreatePage from "./pages/PayrollCreatePage";
import PayrollDetailPage from "./pages/PayrollDetailPage";
import PayrollEditPage from "./pages/PayrollEditPage";

import EmployeesPage from "./pages/EmployeesPage";
import EmployeeCreatePage from "./pages/EmployeeCreatePage";
import EmployeeEditPage from "./pages/EmployeeEditPage";
import SalaryProfileCreatePage from "./pages/SalaryProfileCreatePage";

import MyProfilePage from "./pages/MyProfilePage";

export default function App() {
  const authed = isAuthed();

  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ ROOT */}
        <Route path="/" element={<Navigate to={authed ? "/payrolls" : "/login"} replace />} />

        {/* ✅ PUBLIC (kalau sudah login, lempar ke /payrolls) */}
        <Route path="/login" element={authed ? <Navigate to="/payrolls" replace /> : <Login />} />
        <Route
          path="/register"
          element={authed ? <Navigate to="/payrolls" replace /> : <Register />}
        />

        {/* ✅ PROTECTED + LAYOUT */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Payroll */}
          <Route path="/payrolls" element={<PayrollList />} />
          <Route path="/payrolls/new" element={<PayrollCreatePage />} />
          <Route path="/payrolls/:id" element={<PayrollDetailPage />} />
          <Route path="/payrolls/:id/edit" element={<PayrollEditPage />} />

          {/* Employees */}
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
          <Route
            path="/employees/:id/salary-profile/new"
            element={<SalaryProfileCreatePage />}
          />

          {/* My Profile */}
          <Route path="/my-profile" element={<MyProfilePage />} />
        </Route>

        {/* ✅ FALLBACK PALING BAWAH */}
        <Route path="*" element={<Navigate to={authed ? "/payrolls" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
