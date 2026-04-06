export enum GpsEventType {
  SALE = 'SALE',
  QUOTE = 'QUOTE',
  COLLECTION = 'COLLECTION',
}

export interface GpsEvent {
  id: string;
  userId: string;
  eventType: GpsEventType;
  eventId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface GpsEventFilters {
  userId?: string;
  eventType?: GpsEventType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
