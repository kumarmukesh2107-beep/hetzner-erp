import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { signAuthToken } from '../middleware/auth.js';

function validateEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email);
}

export async function register(req, res, next) {
  const { name, email, password, role = 'staff' } = req.body || {};
  if (!name || !validateEmail(email) || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (!pool) return res.status(503).json({ error: 'Database not configured' });

  try {
    const passwordHash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase(), passwordHash, role === 'admin' ? 'admin' : 'staff'],
    );

    const user = { id: result.insertId, name, email: email.toLowerCase(), role: role === 'admin' ? 'admin' : 'staff' };
    const token = signAuthToken(user);
    return res.status(201).json({ token, user });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (!validateEmail(email) || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (!pool) return res.status(503).json({ error: 'Database not configured' });

  try {
    const [rows] = await pool.execute('SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
    const user = rows?.[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAuthToken(user);
    return res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
}
