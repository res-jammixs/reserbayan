import { API_BASE_URL } from '@/lib/api';
import AnnouncementsManagement from '@/features/admin/announcements/AnnouncementsManagementPage';

export default function AdminAnnouncementsPage() {
  return (
    <AnnouncementsManagement
      apiBase={`${API_BASE_URL}/api/admin`}
      roleLabel="Admin"
    />
  );
}
