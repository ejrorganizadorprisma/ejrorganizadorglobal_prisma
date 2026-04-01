import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { StorageSpace, StorageShelf, StorageSection } from '@ejr/shared-types';

export function useStorageSpaces() {
  return useQuery({
    queryKey: ['storage-spaces'],
    queryFn: async () => {
      try {
        const response = await api.get('/storage-locations/spaces');
        return response.data.data as StorageSpace[];
      } catch (error) {
        console.warn('Storage spaces not available yet');
        return [];
      }
    },
  });
}

export function useStorageShelves(spaceId?: string) {
  return useQuery({
    queryKey: ['storage-shelves', spaceId],
    queryFn: async () => {
      try {
        const url = spaceId
          ? `/storage-locations/shelves?spaceId=${spaceId}`
          : '/storage-locations/shelves';
        const response = await api.get(url);
        return response.data.data as StorageShelf[];
      } catch (error) {
        console.warn('Storage shelves not available yet');
        return [];
      }
    },
  });
}

export function useStorageSections(shelfId?: string) {
  return useQuery({
    queryKey: ['storage-sections', shelfId],
    queryFn: async () => {
      try {
        const url = shelfId
          ? `/storage-locations/sections?shelfId=${shelfId}`
          : '/storage-locations/sections';
        const response = await api.get(url);
        return response.data.data as StorageSection[];
      } catch (error) {
        console.warn('Storage sections not available yet');
        return [];
      }
    },
  });
}
