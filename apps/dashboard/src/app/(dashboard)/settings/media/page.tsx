import { MediaCatalogSettings } from '@/components/settings/MediaCatalogSettings';

export const metadata = {
  title: 'مكتبة الوسائط والكتالوج | OmniDesk',
  description: 'إدارة وتحديث بروشورات الباقات، باركودات الدفع، وكتالوج المنتجات المرسلة تلقائياً عبر واتساب',
};

export default function MediaSettingsPage() {
  return <MediaCatalogSettings />;
}
