import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AdminLayout } from '@/layouts';
import { LoadingState } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import {
  LoginPage,
  DashboardPage,
  ComplaintsPage,
  ComplaintDetailPage,
  ResponsesPage,
  CategoriesPage,
  MapPage,
  LocationActivityPage,
  AnalyticsPage,
  AuditLogsPage,
  SettingsPage,
  NotFoundPage,
} from '@/pages';

/**
 * Protected Admin Route Wrapper
 * Strictly requires valid Supabase authenticated session and active admin_users membership.
 */
const ProtectedAdminRoute: React.FC = () => {
  const { session, user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState fullHeight message="Verifying administrative session..." />;
  }

  if (!session || !user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

/**
 * Public Authentication Route Wrapper
 * If an active authenticated admin visits /login, redirects to /dashboard.
 */
const PublicAuthRoute: React.FC = () => {
  const { session, user, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState fullHeight message="Verifying session..." />;
  }

  if (session && user && isAdmin) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <LoginPage />;
};

export const AppRoutes: React.FC = () => {
  const { session, user, isAdmin, isLoading } = useAuth();

  return (
    <Suspense fallback={<LoadingState fullHeight message="Loading view..." />}>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<PublicAuthRoute />} />

        {/* Protected Admin Shell Routes */}
        <Route element={<ProtectedAdminRoute />}>
          <Route
            path="/"
            element={
              isLoading ? (
                <LoadingState fullHeight message="Verifying session..." />
              ) : session && user && isAdmin ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/responses" element={<ResponsesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/location-activity" element={<LocationActivityPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
