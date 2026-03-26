import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Pokaż loading podczas sprawdzania auth
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Jeśli niezalogowany - przekieruj na login
  if (!currentUser) {
    return <Navigate to="/crm/login" state={{ from: location }} replace />;
  }

  // Zalogowany - pokaż zawartość (Outlet dla layout route)
  return children || <Outlet />;
};

export default ProtectedRoute;