import { API_BASE_URL } from '@/lib/api';
import AnnouncementsManagement from '@/features/admin/announcements/AnnouncementsManagementPage';

export default function SuperAdminAnnouncementsPage() {
  return (
    <AnnouncementsManagement
      apiBase={`${API_BASE_URL}/api/superadmin`}
      roleLabel="Super Admin"
    />
  );
}
