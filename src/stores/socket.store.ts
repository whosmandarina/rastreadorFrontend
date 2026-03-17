import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants';

export interface LiveUser {
  id_user: number;
  nombre?: string;
  latitud: number;
  longitud: number;
  velocidad?: number;
  bateria?: number;
  senal?: string;
  timestamp?: string;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
}

export interface LiveAlert {
  id_alert: number;
  id_user: number;
  tipo_alerta: string;
  descripcion: string;
  timestamp_alerta: string;
}

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  liveUsers: Record<number, LiveUser>;
  recentAlerts: LiveAlert[];

  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,
  liveUsers: {},
  recentAlerts: [],

  connect: (token: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ connected: true });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('location_updated', (data: Omit<LiveUser, 'status'>) => {
      set((state) => ({
        liveUsers: {
          ...state.liveUsers,
          [data.id_user]: {
            // Preservar nombre si ya existe, el evento puede no traerlo
            nombre: state.liveUsers[data.id_user]?.nombre,
            ...data,
            status: 'ONLINE',
          },
        },
      }));
    });

    socket.on('user_status_changed', (data: { id_user: number; status: 'ONLINE' | 'OFFLINE'; timestamp: string }) => {
      set((state) => ({
        liveUsers: {
          ...state.liveUsers,
          [data.id_user]: {
            ...(state.liveUsers[data.id_user] || {}),
            id_user: data.id_user,
            status: data.status,
          } as LiveUser,
        },
      }));
    });

    socket.on('new_alert', (alert: LiveAlert) => {
      set((state) => ({
        recentAlerts: [alert, ...state.recentAlerts].slice(0, 50),
      }));
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false, liveUsers: {}, recentAlerts: [] });
  },
}));