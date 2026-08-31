export type AnnouncementVariant = 'info' | 'warning' | 'important';
export type AnnouncementTargetType = 'category' | 'product' | null;

export interface CustomerAnnouncement {
  id: string;
  title: string;
  body: string;
  variant: AnnouncementVariant;
  startsAt: string;
  endsAt: string | null;
  dismissible: boolean;
  updatedAt: string;
  targetType: AnnouncementTargetType;
  targetValue: string | null;
  targetLabel: string | null;
}

export interface AdminAnnouncement extends CustomerAnnouncement {
  isActive: boolean;
  createdAt: string;
}
