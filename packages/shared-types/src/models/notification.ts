export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  QUOTE_PENDING = 'QUOTE_PENDING',
  SALE_COMPLETED = 'SALE_COMPLETED',
  INFO = 'INFO',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
