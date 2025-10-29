/**
 * Robust IndexedDB wrapper with automatic versioned migrations.
 * Supports safe creation, upgrade, and deletion of object stores.
 */

export type StoreDef = {
  name: string;
  keyPath?: string;
  options?: IDBObjectStoreParameters;
};

export interface DBConfig {
  /** Database name */
  name: string;
  /** Schema version (increment when you add new stores or indexes) */
  version: number;
  /** List of store definitions to ensure exist */
  stores: StoreDef[];
  /** Optional migration callback for fine-grained control */
  onUpgrade?: (db: IDBDatabase, oldVersion: number, newVersion: number | null) => void | Promise<void>;
}

/**
 * Opens the database safely and performs automatic store creation
 * plus custom upgrade migrations.
 */
export async function openDatabase(config: DBConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(config.name, config.version);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = async (e) => {
      const db = req.result;
      const oldVersion = e.oldVersion || 0;
      const newVersion = e.newVersion;

      console.info(`[IndexedDB] Upgrading ${config.name} from v${oldVersion} → v${newVersion}`);

      for (const def of config.stores) {
        if (!db.objectStoreNames.contains(def.name)) {
          db.createObjectStore(def.name, {
            keyPath: def.keyPath,
            ...def.options,
          });
          console.info(`[IndexedDB] Created store: ${def.name}`);
        }
      }

      for (const name of Array.from(db.objectStoreNames)) {
        if (!config.stores.some((s) => s.name === name)) {
          db.deleteObjectStore(name);
          console.info(`[IndexedDB] Deleted obsolete store: ${name}`);
        }
      }

      if (config.onUpgrade) {
        try {
          await config.onUpgrade(db, oldVersion, newVersion);
        } catch (err) {
          console.error(`[IndexedDB] onUpgrade error:`, err);
        }
      }
    };
  });
}

/**
 * Robust IndexedDB wrapper with automatic versioned migrations.
 */
export const DB = {
  async put<T>(db: IDBDatabase, store: string, value: T, key?: IDBValidKey) {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, `readwrite`);
      const req = key ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async get<T>(db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, `readonly`);
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, `readonly`);
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(db: IDBDatabase, store: string, key: IDBValidKey) {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, `readwrite`);
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear(db: IDBDatabase, store: string) {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, `readwrite`);
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async deleteWhereKey(db: IDBDatabase, store: string, predicate: (key: IDBValidKey) => boolean) {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, `readwrite`);
      const s = tx.objectStore(store);
      const req = s.openCursor();

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if (predicate(cursor.key)) cursor.delete();
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

/** For dev resets */
export function resetDatabase(name: string) {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
