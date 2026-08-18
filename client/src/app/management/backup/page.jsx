import BackupManager from '@/features/admin/pages/BackupManager';

export const metadata = {
  title: 'Backup & Restore | KSubZone Admin Dashboard',
  description: 'Manage Google Drive automated backups and local restore archives.',
};

export default function Page() {
  return <BackupManager />;
}
