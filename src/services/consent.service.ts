import api from './api';

export const consentService = {
  register: async (id_user: number) => {
    const { data } = await api.post('/consents', { id_user });
    return data;
  },
  getByUser: async (id_user: number) => {
    const { data } = await api.get(`/consents/user/${id_user}`);
    return data;
  },
  revoke: async () => {
    const { data } = await api.post('/consents/revoke');
    return data;
  },
};
