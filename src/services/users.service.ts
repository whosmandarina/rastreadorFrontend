import api from './api';

export interface User {
  id_user: number;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
  is_active: boolean;
  created_at: string;
}

const normalizeUser = (user: any): User => ({
  ...user,
  is_active: Boolean(user?.is_active),
});

export const usersService = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return Array.isArray(data) ? data.map(normalizeUser) : [];
  },
  getById: async (id: number): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return normalizeUser(data);
  },
  update: async (id: number, payload: Partial<User>) => {
    const { data } = await api.put(`/users/${id}`, payload);
    return normalizeUser(data);
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
};
