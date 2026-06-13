import AnnouncementsManagement from '@/features/admin/announcements/AnnouncementsManagementPage';

export default function SuperAdminAnnouncementsPage() {
  return (
    <AnnouncementsManagement
      apiBase="/api/superadmin"
      roleLabel="Super Admin"
    />
  );
}
