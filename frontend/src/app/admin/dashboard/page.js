'use client';

import AdminDashboardPage from '@/features/admin/dashboard/AdminDashboardPage';

export default function AdminDashboard() {
  return (
    <AdminDashboardPage
      apiBase="/api/admin"
      basePath="admin"
      allowedRoles={['ADMIN', 'SUPER_ADMIN']}
      loadingText="Loading Admin Panel..."
      roleLabel="Admin Panel"
      quickActionMode="admin"
    />
  );
}
