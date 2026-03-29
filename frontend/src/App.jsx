import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SubmitExpense from './pages/SubmitExpense';
import ExpenseDetail from './pages/ExpenseDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const RoleRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'Admin') return <Navigate to="/admin" />;
  if (user.role === 'Manager') return <Navigate to="/manager" />;
  if (user.role === 'Finance') return <Navigate to="/finance" />;
  if (user.role === 'Director') return <Navigate to="/director" />;
  return <Navigate to="/employee" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route path="/employee" element={
            <PrivateRoute roles={['Employee']}>
              <EmployeeDashboard />
            </PrivateRoute>
          } />
          <Route path="/employee/submit" element={
            <PrivateRoute roles={['Employee']}>
              <SubmitExpense />
            </PrivateRoute>
          } />

          <Route path="/manager" element={
            <PrivateRoute roles={['Manager']}>
              <ManagerDashboard />
            </PrivateRoute>
          } />

          <Route path="/finance" element={
            <PrivateRoute roles={['Finance']}>
              <FinanceDashboard />
            </PrivateRoute>
          } />

          <Route path="/director" element={
            <PrivateRoute roles={['Director']}>
              <FinanceDashboard />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute roles={['Admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />

          <Route path="/expenses/:id" element={
            <PrivateRoute>
              <ExpenseDetail />
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
