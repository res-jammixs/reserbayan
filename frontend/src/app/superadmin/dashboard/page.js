'use client';
import { API_BASE_URL } from '@/lib/api';

import AdminDashboardPage from '@/features/admin/dashboard/AdminDashboardPage';

export default function SuperAdminDashboard() {
  return (
    <AdminDashboardPage
      apiBase={`${API_BASE_URL}/api/superadmin`}
      basePath="superadmin"
      allowedRoles={['SUPER_ADMIN']}
      redirectForRole={{ ADMIN: '/admin/dashboard' }}
      loadingText="Loading System..."
      roleLabel="Super Admin Panel"
      quickActionMode="superadmin"
    />
  );
}
