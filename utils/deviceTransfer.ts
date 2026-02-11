import { loadInventoryImages, saveInventoryImages } from './persistence';

const TRANSFER_STORAGE_KEYS = [
  'nexus_inventory_state_v1',
  'nexus_sales_state_v1',
  'nexus_purchase_state_v1',
  'nexus_contact_state_v1',
  'nexus_accounting_state_v1',
  'nexus_payroll_state_v1',
  'nexus_company_state_v1',
  'nexus_erp_user',
  'nexus_active_company',
  'nexus_sales_people',
];

export interface NexusTransferSnapshot {
  exportedAt: string;
  storage: Record<string, string>;
  inventoryImages: Record<string, string>;
}

export const exportDeviceSnapshot = async (): Promise<NexusTransferSnapshot> => {
  const storage: Record<string, string> = {};

  TRANSFER_STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value != null) storage[key] = value;
  });

  const settingsKeys = Object.keys(localStorage).filter((key) => key.startsWith('nexus_settings_state_v1_'));
  settingsKeys.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value != null) storage[key] = value;
  });

  return {
    exportedAt: new Date().toISOString(),
    storage,
    inventoryImages: await loadInventoryImages(),
  };
};

export const importDeviceSnapshot = async (snapshot: NexusTransferSnapshot): Promise<void> => {
  Object.entries(snapshot.storage || {}).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });

  if (snapshot.inventoryImages && typeof snapshot.inventoryImages === 'object') {
    await saveInventoryImages(snapshot.inventoryImages);
  }
};
