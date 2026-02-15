import { pool } from '../db/pool.js';
import { loadModuleData, saveModuleData } from '../db/legacyStore.js';

const LEGACY_TABLE = 'legacy_customers';

function isLegacyPayload(body) {
  return body && typeof body === 'object' && Array.isArray(body.customers);
}

export async function getCustomers(req, res, next) {
  try {
    const wantsRelational = req.query.mode === 'relational' || Boolean(req.user);
    if (wantsRelational) {
      if (!pool) return res.status(503).json({ error: 'Database not configured' });
      const [rows] = await pool.query('SELECT id, name, phone, email, address, created_at FROM customers ORDER BY id DESC');
      return res.status(200).json(rows);
    }

    const snapshot = await loadModuleData(pool, LEGACY_TABLE);
    return res.status(200).json(snapshot);
  } catch (error) {
    return next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    if (isLegacyPayload(req.body)) {
      await saveModuleData(pool, LEGACY_TABLE, req.body);
      return res.status(200).json({ ok: true, module: 'customers', legacy: true });
    }

    const { name, phone, email, address } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!pool) return res.status(503).json({ error: 'Database not configured' });

    const [result] = await pool.execute(
      'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [name, phone || null, email || null, address || null],
    );

    return res.status(201).json({ id: result.insertId, name, phone: phone || null, email: email || null, address: address || null });
  } catch (error) {
    return next(error);
  }
}
