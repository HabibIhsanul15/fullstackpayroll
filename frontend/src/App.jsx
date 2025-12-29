import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import PayrollList from "./pages/PayrollList";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import PayrollDetail from "./pages/PayrollDetail";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeeCreatePage from "./pages/EmployeeCreatePage";
import SalaryProfileCreatePage from "./pages/SalaryProfileCreatePage";
import PayrollCreatePage from "./pages/PayrollCreatePage";
import { isAuthed } from "./lib/auth";
import PayrollEditPage from "./pages/PayrollEditPage";
import EmployeeEditPage from "./pages/EmployeeEditPage";

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
          <Route path="/payrolls" element={<PayrollList />} />
          <Route path="/payrolls/new" element={<PayrollCreatePage />} />
          <Route path="/payrolls/:id" element={<PayrollDetail />} />
          <Route path="/payrolls/:id/edit" element={<PayrollEditPage />} />

          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route path="/employees/:id/salary-profile/new" element={<SalaryProfileCreatePage />} />
          <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
        </Route>

        {/* Fallback: kalau belum login -> /login, kalau sudah -> /payrolls */}
        <Route
          path="*"
          element={<Navigate to={isAuthed() ? "/payrolls" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
