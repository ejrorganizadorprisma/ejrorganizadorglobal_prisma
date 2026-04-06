import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface GpsEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: 'SALE' | 'QUOTE' | 'COLLECTION';
  eventId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  createdAt: string;
}

export interface GpsEventFilters {
  userId?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function useGpsEvents(filters: GpsEventFilters) {
  return useQuery({
    queryKey: ['gps', 'events', filters],
    queryFn: async () => {
      const { data } = await api.get('/gps/events', { params: filters });
      return data as { data: GpsEvent[]; pagination: any };
    },
  });
}
