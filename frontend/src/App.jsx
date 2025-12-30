import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import PayrollList from "./pages/PayrollList";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeCreatePage from "./pages/EmployeeCreatePage";
import SalaryProfileCreatePage from "./pages/SalaryProfileCreatePage";
import PayrollCreatePage from "./pages/PayrollCreatePage";
import PayrollEditPage from "./pages/PayrollEditPage";
import EmployeeEditPage from "./pages/EmployeeEditPage";
import PayrollDetailPage from "./pages/PayrollDetailPage"; // ✅ pakai 1 detail page aja
import { isAuthed } from "./lib/auth";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected + Layout */}
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
          <Route
            path="/employees/:id/salary-profile/new"
            element={<SalaryProfileCreatePage />}
          />
          <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthed() ? "/payrolls" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
