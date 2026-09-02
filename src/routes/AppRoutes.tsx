import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AdminLayout } from '@/layouts';
import { LoadingState, AccessDenied } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_NAVIGATION_ITEMS } from '@/routes/routes.config';
import {
  LoginPage,
  DashboardPage,
  ComplaintsPage,
  ComplaintDetailPage,
  ResponsesPage,
  CategoriesPage,
  MapPage,
  LocationActivityPage,
  RolesPage,
  CreateRolePage,
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
 * Permission Guard Wrapper
 * Checks if current authenticated admin has the required permission.
 * If unauthorized, renders accessible AccessDenied component.
 */
interface PermissionGuardProps {
  requiredPermission: string;
  fallbackPath?: string;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredPermission,
  fallbackPath = '/dashboard',
  children,
}) => {
  const { hasPermission, permissionsLoading, isLoading } = useAuth();

  if (isLoading || permissionsLoading) {
    return <LoadingState fullHeight message="Verifying permissions..." />;
  }

  if (!hasPermission(requiredPermission)) {
    return (
      <AccessDenied
        requiredPermission={requiredPermission}
        fallbackPath={fallbackPath}
      />
    );
  }

  return <>{children}</>;
};

/**
 * Root Route Redirector
 * Directs user to the first accessible navigation item they have permission for.
 */
const RootRedirect: React.FC = () => {
  const { session, user, isAdmin, isLoading, hasPermission, isBootstrapMode } = useAuth();

  if (isLoading) {
    return <LoadingState fullHeight message="Verifying session..." />;
  }

  if (!session || !user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (isBootstrapMode || hasPermission('dashboard.view')) {
    return <Navigate to="/dashboard" replace />;
  }

  for (const item of ADMIN_NAVIGATION_ITEMS) {
    if (!item.requiredPermission || hasPermission(item.requiredPermission)) {
      return <Navigate to={item.path} replace />;
    }
  }

  return <Navigate to="/dashboard" replace />;
};

/**
 * Public Authentication Route Wrapper
 * If an active authenticated admin visits /login, redirects to their home.
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
  return (
    <Suspense fallback={<LoadingState fullHeight message="Loading view..." />}>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<PublicAuthRoute />} />

        {/* Protected Admin Shell Routes */}
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/" element={<RootRedirect />} />
          
          <Route
            path="/dashboard"
            element={
              <PermissionGuard requiredPermission="dashboard.view">
                <DashboardPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/complaints"
            element={
              <PermissionGuard requiredPermission="complaints.view">
                <ComplaintsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/complaints/:id"
            element={
              <PermissionGuard requiredPermission="complaints.view">
                <ComplaintDetailPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/responses"
            element={
              <PermissionGuard requiredPermission="responses.view">
                <ResponsesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/categories"
            element={
              <PermissionGuard requiredPermission="categories.view">
                <CategoriesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/map"
            element={
              <PermissionGuard requiredPermission="map.view">
                <MapPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/location-activity"
            element={
              <PermissionGuard requiredPermission="location_activity.view">
                <LocationActivityPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/roles"
            element={
              <PermissionGuard requiredPermission="roles.manage">
                <RolesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="/roles/create"
            element={
              <PermissionGuard requiredPermission="roles.manage">
                <CreateRolePage />
              </PermissionGuard>
            }
          />

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
