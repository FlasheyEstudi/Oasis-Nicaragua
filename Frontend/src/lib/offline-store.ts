// OASIS - Offline Store
// IndexedDB client-side database wrapper for POS offline operations

export interface OfflineSale {
  id?: number;
  pharmacyId: string;
  saleData: any;
  createdAt: number;
  status: 'pending' | 'failed';
  retryCount: number;
}

const DB_NAME = 'oasis-offline-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      
      // Store for pharmacy inventory catalogs
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'pharmacyId' });
      }

      // Store for pending offline sales
      if (!db.objectStoreNames.contains('pendingSales')) {
        db.createObjectStore('pendingSales', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Cache pharmacy inventory items locally
 */
export async function cacheInventory(pharmacyId: string, items: any[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('inventory', 'readwrite');
      const store = transaction.objectStore('inventory');
      
      const request = store.put({
        pharmacyId,
        items,
        cachedAt: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to cache inventory locally:', error);
  }
}

/**
 * Get cached inventory items for a pharmacy
 */
export async function getCachedInventory(pharmacyId: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('inventory', 'readonly');
      const store = transaction.objectStore('inventory');
      const request = store.get(pharmacyId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.items : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to retrieve cached inventory:', error);
    return null;
  }
}

/**
 * Queue a new sale locally when offline
 */
export async function queueOfflineSale(pharmacyId: string, saleData: any): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingSales', 'readwrite');
    const store = transaction.objectStore('pendingSales');
    
    const offlineSale: Omit<OfflineSale, 'id'> = {
      pharmacyId,
      saleData,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    const request = store.add(offlineSale);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending sales queued offline
 */
export async function getPendingOfflineSales(): Promise<OfflineSale[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingSales', 'readonly');
      const store = transaction.objectStore('pendingSales');
      const request = store.getAll();

      request.onsuccess = () => {
        // Return only pending sales (or all, sorted)
        const sales = (request.result as OfflineSale[]) || [];
        resolve(sales.filter(s => s.status === 'pending'));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to retrieve pending sales:', error);
    return [];
  }
}

/**
 * Mark a pending sale as failed (e.g., if API rejects it after reconnecting)
 */
export async function markPendingSaleFailed(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingSales', 'readwrite');
    const store = transaction.objectStore('pendingSales');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const sale = getRequest.result as OfflineSale;
      if (sale) {
        sale.status = 'failed';
        sale.retryCount += 1;
        const updateRequest = store.put(sale);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete a successfully synchronized sale
 */
export async function removePendingSale(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('pendingSales', 'readwrite');
    const store = transaction.objectStore('pendingSales');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get the total count of pending offline sales
 */
export async function getPendingSalesCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('pendingSales', 'readonly');
      const store = transaction.objectStore('pendingSales');
      const request = store.getAll();

      request.onsuccess = () => {
        const sales = (request.result as OfflineSale[]) || [];
        resolve(sales.filter(s => s.status === 'pending').length);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return 0;
  }
}
