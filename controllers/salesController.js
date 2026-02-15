import { pool } from '../db/pool.js';
import { loadModuleData, saveModuleData } from '../db/legacyStore.js';

const LEGACY_TABLE = 'legacy_sales';

function isLegacyPayload(body) {
  return body && typeof body === 'object' && (Array.isArray(body.sales) || Array.isArray(body.salesLogs));
}

export async function getSales(req, res, next) {
  try {
    const wantsRelational = req.query.mode === 'relational' || Boolean(req.user);
    if (wantsRelational) {
      if (!pool) return res.status(503).json({ error: 'Database not configured' });

      const [rows] = await pool.query(`
        SELECT s.id, s.customer_id, s.total_amount, s.status, s.created_at,
               c.name AS customer_name
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        ORDER BY s.id DESC
      `);
      return res.status(200).json(rows);
    }

    const snapshot = await loadModuleData(pool, LEGACY_TABLE);
    return res.status(200).json(snapshot);
  } catch (error) {
    return next(error);
  }
}

export async function createSale(req, res, next) {
  try {
    if (isLegacyPayload(req.body)) {
      await saveModuleData(pool, LEGACY_TABLE, req.body);
      return res.status(200).json({ ok: true, module: 'sales', legacy: true });
    }

    const { customer_id, total_amount, status = 'created', items } = req.body || {};
    const numericCustomerId = Number(customer_id);
    const numericTotal = Number(total_amount);

    if (Number.isNaN(numericCustomerId) || Number.isNaN(numericTotal) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'customer_id, total_amount and items[] are required' });
    }

    for (const item of items) {
      if (Number.isNaN(Number(item.product_id)) || Number.isNaN(Number(item.quantity)) || Number.isNaN(Number(item.price))) {
        return res.status(400).json({ error: 'each item requires numeric product_id, quantity and price' });
      }
    }

    if (!pool) return res.status(503).json({ error: 'Database not configured' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [saleResult] = await conn.execute(
        'INSERT INTO sales (customer_id, total_amount, status) VALUES (?, ?, ?)',
        [numericCustomerId, numericTotal, status],
      );
      const saleId = saleResult.insertId;

      for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);
        const price = Number(item.price);

        await conn.execute(
          'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [saleId, productId, quantity, price],
        );

        const [stockResult] = await conn.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [quantity, productId, quantity],
        );
        if (!stockResult.affectedRows) {
          throw new Error(`Insufficient stock for product ${productId}`);
        }
      }

      await conn.commit();
      return res.status(201).json({ id: saleId, customer_id: numericCustomerId, total_amount: numericTotal, status });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    return next(error);
  }
}
