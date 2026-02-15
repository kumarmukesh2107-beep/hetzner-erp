export const API_MODULES = {
  sales: 'legacy_sales',
  inventory: 'legacy_inventory',
  products: 'legacy_products',
  users: 'legacy_users',
  purchases: 'legacy_purchases',
  contacts: 'legacy_contacts',
  expenses: 'legacy_expenses',
  accounting: 'legacy_accounting',
  payroll: 'legacy_payroll',
  companies: 'legacy_companies',
  customers: 'legacy_customers',
};

const memoryStore = new Map();

export function resolveModule(moduleName) {
  const moduleKey = String(moduleName || '').toLowerCase();
  const table = API_MODULES[moduleKey];
  if (!table) return null;
  return { moduleKey, table };
}

export async function saveModuleData(pool, table, payload) {
  if (!pool) {
    memoryStore.set(table, payload);
    return;
  }
  await pool.execute(`INSERT INTO \`${table}\` (data) VALUES (CAST(? AS JSON))`, [JSON.stringify(payload)]);
}

export async function loadModuleData(pool, table) {
  if (!pool) {
    return memoryStore.get(table) ?? [];
  }
  const [rows] = await pool.query(`SELECT data FROM \`${table}\` ORDER BY id DESC LIMIT 1`);
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const latest = rows[0]?.data;
  if (typeof latest === 'string') {
    try {
      return JSON.parse(latest);
    } catch {
      return [];
    }
  }
  return latest ?? [];
}
