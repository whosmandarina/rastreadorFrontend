import api from './api';

export interface Alert {
  id_alert: number;
  id_user: number;
  tipo_alerta: string;
  descripcion: string;
  is_read: boolean;
  timestamp_alerta: string;
  nombre?: string;
  usuario_nombre?: string; // campo real del backend (JOIN con Users)
}

export const alertsService = {
  getAll: async (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    const { data } = await api.get('/alerts', { params });
    return data as Alert[];
  },
  markRead: async (id: number) => {
    const { data } = await api.put(`/alerts/${id}/read`);
    return data;
  },
};