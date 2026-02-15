import { pool } from '../db/pool.js';

export async function createPayment(req, res, next) {
  const { sale_id, amount, method } = req.body || {};
  const numericSaleId = Number(sale_id);
  const numericAmount = Number(amount);

  if (Number.isNaN(numericSaleId) || Number.isNaN(numericAmount) || !method) {
    return res.status(400).json({ error: 'sale_id, amount and method are required' });
  }
  if (!pool) return res.status(503).json({ error: 'Database not configured' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO payments (sale_id, amount, method) VALUES (?, ?, ?)',
      [numericSaleId, numericAmount, method],
    );

    return res.status(201).json({ id: result.insertId, sale_id: numericSaleId, amount: numericAmount, method });
  } catch (error) {
    return next(error);
  }
}
