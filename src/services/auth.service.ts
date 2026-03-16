import api from './api';

export interface LoginPayload {
  correo: string;
  password: string;
  device_id?: string;
}

// Registro público (app móvil) - solo USER con código de supervisor
export interface RegisterPayload {
  nombre: string;
  correo: string;
  password: string;
  telefono?: string;
  codigo_supervisor: number; // ID del supervisor - obligatorio
}

// Creación desde dashboard (ADMIN o SUPERVISOR) - usa POST /api/users
export interface CreateUserPayload {
  nombre: string;
  correo: string;
  password: string;
  telefono?: string;
  rol?: 'ADMIN' | 'SUPERVISOR' | 'USER'; // Solo ADMIN lo envía
  supervisorId?: number | null; // Solo ADMIN cuando crea USER
}

export interface AuthUser {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export const authService = {
  // Registro público móvil - requiere codigo_supervisor
  register: async (payload: RegisterPayload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  // Creación de usuario desde dashboard - POST /api/users
  createUser: async (payload: CreateUserPayload) => {
    const { data } = await api.post('/users', payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },
};
