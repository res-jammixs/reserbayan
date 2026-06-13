import AnnouncementsManagement from '@/features/admin/announcements/AnnouncementsManagementPage';

export default function AdminAnnouncementsPage() {
  return (
    <AnnouncementsManagement
      apiBase="/api/admin"
      roleLabel="Admin"
    />
  );
}
