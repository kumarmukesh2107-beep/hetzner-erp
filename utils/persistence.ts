export const loadLocalState = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to load storage key \"${key}\":`, error);
    return fallback;
  }
};

export const saveLocalState = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('nexus_last_local_change_at', new Date().toISOString());
    window.dispatchEvent(new CustomEvent('nexus-local-state-changed', { detail: { key } }));
    return true;
  } catch (error) {
    console.warn(`Failed to save storage key \"${key}\":`, error);
    return false;
  }
};

const DB_NAME = 'nexus_erp_assets';
const DB_VERSION = 1;
const IMAGE_STORE = 'inventory_product_images';

const openImageDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(IMAGE_STORE)) {
      db.createObjectStore(IMAGE_STORE);
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const loadInventoryImages = async (): Promise<Record<string, string>> => {
  if (typeof indexedDB === 'undefined') return {};
  const db = await openImageDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readonly');
    const store = tx.objectStore(IMAGE_STORE);
    const req = store.get('images');

    req.onsuccess = () => resolve((req.result || {}) as Record<string, string>);
    req.onerror = () => reject(req.error);
  });
};

export const saveInventoryImages = async (images: Record<string, string>): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  const db = await openImageDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_STORE);
    store.put(images, 'images');

    tx.oncomplete = () => {
      localStorage.setItem('nexus_last_local_change_at', new Date().toISOString());
      window.dispatchEvent(new CustomEvent('nexus-local-state-changed', { detail: { key: IMAGE_STORE } }));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};
