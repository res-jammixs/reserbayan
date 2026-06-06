'use client';
import { API_BASE_URL } from '@/lib/api';

import AdminDashboardPage from '@/features/admin/dashboard/AdminDashboardPage';

export default function AdminDashboard() {
  return (
    <AdminDashboardPage
      apiBase={`${API_BASE_URL}/api/admin`}
      basePath="admin"
      allowedRoles={['ADMIN', 'SUPER_ADMIN']}
      loadingText="Loading Admin Panel..."
      roleLabel="Admin Panel"
      quickActionMode="admin"
    />
  );
}
