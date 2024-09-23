type Timestamp = number;

interface IDBLibrary {
  set<T>(key: string, value: T): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  append<T>(items: T[]): Promise<void>;
  aggregate<T, R>(callback: (item: T) => R): Promise<R>;
  scan<T>(from: Timestamp, limit?: number): Promise<T[]>;
  clear(): Promise<void>;
}


class IndexedDBLibrary implements IDBLibrary {
  private dbName = "myDatabase";
  private kvStore = "kv_collection";
  private activityStore = "activity_collection";
  private version = 1;

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.kvStore)) {
          db.createObjectStore(this.kvStore);
        }
        if (!db.objectStoreNames.contains(this.activityStore)) {
          const activityStore = db.createObjectStore(this.activityStore, { keyPath: 'timestamp' });
          activityStore.createIndex('timestamp', 'timestamp');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.kvStore, 'readwrite');
      const store = transaction.objectStore(this.kvStore);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.kvStore, 'readonly');
      const store = transaction.objectStore(this.kvStore);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async append<T>(items: T[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.activityStore, 'readwrite');
      const store = transaction.objectStore(this.activityStore);

      items.forEach(item => store.add(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async aggregate<T, R>(callback: (item: T) => R): Promise<R> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.activityStore, 'readonly');
      const store = transaction.objectStore(this.activityStore);
      const request = store.openCursor();
      let result: R;

      request.onsuccess = (event) => {
        const cursor = request.result;
        if (cursor) {
          const processed = callback(cursor.value);
          if (result == null) {
            result = processed;
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async scan<T>(from: Timestamp, limit: number = 0): Promise<T[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.activityStore, 'readonly');
      const store = transaction.objectStore(this.activityStore);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.lowerBound(from));
      const results: T[] = [];
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && (limit === 0 || results.length < limit)) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.kvStore, this.activityStore], 'readwrite');

      const kvClearRequest = transaction.objectStore(this.kvStore).clear();
      const activityClearRequest = transaction.objectStore(this.activityStore).clear();

      kvClearRequest.onsuccess = () => {
        if (activityClearRequest.readyState === 'done') resolve();
      };
      kvClearRequest.onerror = () => reject(kvClearRequest.error);

      activityClearRequest.onsuccess = () => {
        if (kvClearRequest.readyState === 'done') resolve();
      };
      activityClearRequest.onerror = () => reject(activityClearRequest.error);
    });
  }
}

export const db = new IndexedDBLibrary();