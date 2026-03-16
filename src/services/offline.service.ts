import * as SQLite from 'expo-sqlite';

const DB_NAME = 'rastreador_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

export interface OfflineLocation {
  latitud: number;
  longitud: number;
  precision_gps?: number;
  velocidad?: number;
  bateria?: number;
  senal?: string;
  timestamp_captura: string;
}

export const offlineDB = {
  init: async (): Promise<void> => {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        latitud REAL NOT NULL,
        longitud REAL NOT NULL,
        precision_gps REAL,
        velocidad REAL,
        bateria INTEGER,
        senal TEXT,
        timestamp_captura TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  },

  save: async (loc: OfflineLocation): Promise<void> => {
    if (!db) await offlineDB.init();
    await db!.runAsync(
      `INSERT INTO pending_locations (latitud, longitud, precision_gps, velocidad, bateria, senal, timestamp_captura)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [loc.latitud, loc.longitud, loc.precision_gps ?? null, loc.velocidad ?? null,
       loc.bateria ?? null, loc.senal ?? null, loc.timestamp_captura]
    );
  },

  getPending: async (): Promise<(OfflineLocation & { id: number })[]> => {
    if (!db) await offlineDB.init();
    return await db!.getAllAsync('SELECT * FROM pending_locations ORDER BY timestamp_captura ASC');
  },

  clearAll: async (): Promise<void> => {
    if (!db) await offlineDB.init();
    await db!.runAsync('DELETE FROM pending_locations');
  },

  count: async (): Promise<number> => {
    if (!db) await offlineDB.init();
    const result = await db!.getFirstAsync('SELECT COUNT(*) as count FROM pending_locations') as any;
    return result?.count ?? 0;
  },
};
