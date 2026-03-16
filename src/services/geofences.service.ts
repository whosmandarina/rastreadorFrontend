import api from './api';

export interface Geofence {
  id_geofence: number;
  nombre: string;
  tipo: 'CIRCLE' | 'POLYGON';
  coordenadas: any;
  radio?: number;
}

export const geofencesService = {
  getAll: async (): Promise<Geofence[]> => {
    const { data } = await api.get('/geofences');
    return data;
  },
  create: async (payload: Omit<Geofence, 'id_geofence'>) => {
    const { data } = await api.post('/geofences', payload);
    return data;
  },
  update: async (id: number, payload: Partial<Geofence>) => {
    const { data } = await api.put(`/geofences/${id}`, payload);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/geofences/${id}`);
    return data;
  },
};
