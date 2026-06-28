import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Navbar from './components/Navbar.jsx';
import RecruiterDashboard from './recruiter/RecruiterDashboard.jsx';
import ClientDashboard from './client/ClientDashboard.jsx';

function ProtectedLayout({ allowedRole }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRole && user?.role !== allowedRole) return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'recruiter' ? '/recruiter' : '/client'} replace />
            : <LoginPage />
        }
      />

      {/* Recruiter Routes */}
      <Route element={<ProtectedLayout allowedRole="recruiter" />}>
        <Route path="/recruiter/:tab?" element={<RecruiterDashboard />} />
      </Route>

      {/* Client Routes */}
      <Route element={<ProtectedLayout allowedRole="client" />}>
        <Route path="/client/:tab?" element={<ClientDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
