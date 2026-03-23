import api from './api';
import { offlineDB, OfflineLocation } from './offline.service';

export const locationService = {
  sync: async (
    locations: OfflineLocation[],
  ): Promise<{ puntos_guardados: number }> => {
    const { data } = await api.post('/locations/sync', { locations });
    return data;
  },

  syncPending: async (): Promise<number> => {
    const pending = await offlineDB.getPending();
    if (pending.length === 0) return 0;

    const locations: OfflineLocation[] = pending.map(
      ({ id, created_at, ...loc }: any) => loc,
    );
    await locationService.sync(locations);
    await offlineDB.clearAll();
    return pending.length;
  },

  saveOrSend: async (
    loc: OfflineLocation,
    isOnline: boolean,
  ): Promise<void> => {
    if (isOnline) {
      try {
        await locationService.sync([loc]);
      } catch {
        // fallback to offline if request fails
        await offlineDB.save(loc);
      }
    } else {
      await offlineDB.save(loc);
    }
  },
};
