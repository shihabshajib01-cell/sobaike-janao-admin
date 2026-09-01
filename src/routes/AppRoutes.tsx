import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/layouts';
import { LoadingState } from '@/components/common';
import { authService } from '@/services/auth/authService';
import {
  LoginPage,
  DashboardPage,
  ComplaintsPage,
  ComplaintDetailPage,
  FeedPage,
  ResponsesPage,
  CategoriesPage,
  MapPage,
  UsersPage,
  AnalyticsPage,
  AuditLogsPage,
  SettingsPage,
  NotFoundPage,
} from '@/pages';

export const AppRoutes: React.FC = () => {
  const isAuth = authService.isAuthenticated();

  return (
    <Suspense fallback={<LoadingState fullHeight message="Loading view..." />}>
      <Routes>
        {/* Public Authentication Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Shell Routes */}
        <Route element={<AdminLayout />}>
          {/* Default redirect: If authenticated go to /dashboard, otherwise /dashboard (or /login if preferred) */}
          <Route path="/" element={<Navigate to={isAuth ? "/dashboard" : "/login"} replace />} />
          
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/responses" element={<ResponsesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/users" element={<UsersPage />} />
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
