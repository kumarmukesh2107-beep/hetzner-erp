import { pool } from '../db/pool.js';
import { loadModuleData, saveModuleData } from '../db/legacyStore.js';

const LEGACY_TABLE = 'legacy_products';

function isLegacyPayload(body) {
  return body && typeof body === 'object' && (Array.isArray(body.products) || Array.isArray(body.categories));
}

export async function getProducts(req, res, next) {
  try {
    const wantsRelational = req.query.mode === 'relational' || Boolean(req.user);
    if (wantsRelational) {
      if (!pool) return res.status(503).json({ error: 'Database not configured' });
      const [rows] = await pool.query('SELECT id, name, sku, price, stock, created_at FROM products ORDER BY id DESC');
      return res.status(200).json(rows);
    }

    const snapshot = await loadModuleData(pool, LEGACY_TABLE);
    return res.status(200).json(snapshot);
  } catch (error) {
    return next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    if (isLegacyPayload(req.body)) {
      await saveModuleData(pool, LEGACY_TABLE, req.body);
      return res.status(200).json({ ok: true, module: 'products', legacy: true });
    }

    const { name, sku, price, stock = 0 } = req.body || {};
    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (!name || Number.isNaN(numericPrice)) {
      return res.status(400).json({ error: 'name and numeric price are required' });
    }
    if (Number.isNaN(numericStock)) {
      return res.status(400).json({ error: 'stock must be numeric' });
    }
    if (!pool) return res.status(503).json({ error: 'Database not configured' });

    const [result] = await pool.execute(
      'INSERT INTO products (name, sku, price, stock) VALUES (?, ?, ?, ?)',
      [name, sku || null, numericPrice, numericStock],
    );

    return res.status(201).json({ id: result.insertId, name, sku: sku || null, price: numericPrice, stock: numericStock });
  } catch (error) {
    return next(error);
  }
}
