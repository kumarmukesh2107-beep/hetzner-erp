import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import mysql from 'mysql2';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db/pool.js';
import { ensureSchema } from './db/schema.js';
import { loadModuleData, resolveModule, saveModuleData } from './db/legacyStore.js';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8788;
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASSWORD || 'Erp@12345',
  database: process.env.DB_NAME || 'erp_db',
});
const uploadsDir = path.join(__dirname, 'uploads');

db.connect(err => {
  if (err) console.error('DB ERROR:', err);
  else console.log('MySQL Connected');
});

const dbClient = db.promise();

ensureSchema(pool).catch(error => {
  console.error('[db] schema initialization failed:', error?.message || error);
});

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API working' });
});

app.use('/uploads', express.static(uploadsDir));

function uploadHandler(req, res) {
  upload.single('file')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }

      return res.status(400).json({ error: error.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    return res.status(200).json({
      ok: true,
      url: `/uploads/${req.file.filename}`,
    });
  });
}

app.post('/upload', uploadHandler);
app.post('/api/upload', uploadHandler);

// New structured relational routes (kept alongside legacy endpoints for backward compatibility)
app.use('/api/auth', authRoutes);
app.use('/api', customerRoutes);
app.use('/api', productRoutes);
app.use('/api', salesRoutes);
app.use('/api', paymentRoutes);

const modules = ['sales', 'products', 'inventory', 'contacts', 'purchases'];

for (const table of modules) {
  app.get(`/api/${table}`, async (_req, res, next) => {
    try {
      const [rows] = await dbClient.query(`SELECT data FROM ${table}`);
      const data = rows.map(row => {
        if (typeof row.data === 'string') {
          try {
            return JSON.parse(row.data);
          } catch (_error) {
            return row.data;
          }
        }

        return row.data;
      });

      return res.status(200).json({ data });
    } catch (error) {
      return next(error);
    }
  });

  app.post(`/api/${table}`, async (req, res, next) => {
    try {
      await dbClient.query(`INSERT INTO ${table} (data) VALUES (?)`, [JSON.stringify(req.body ?? {})]);
      return res.status(201).json({ success: true });
    } catch (error) {
      return next(error);
    }
  });
}

app.get('/api/sync/:companyId', async (req, res, next) => {
  const { companyId } = req.params;
  console.log('SYNC GET:', companyId);

  try {
    const [rows] = await dbClient.query(
      'SELECT data FROM sync_data WHERE company_id = ? ORDER BY updated_at DESC LIMIT 1',
      [companyId],
    );

    if (!rows.length) {
      return res.json({ data: {} });
    }

    return res.json({ data: rows[0].data ?? {} });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/sync/:companyId', async (req, res, next) => {
  const { companyId } = req.params;
  const data = req.body ?? {};
  console.log('SYNC PUT:', companyId);

  try {
    await dbClient.query('INSERT INTO sync_data (company_id, data) VALUES (?, ?)', [
      companyId,
      JSON.stringify(data),
    ]);

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// Legacy snapshot API remains active for existing frontend/local-state sync flows.
app.post('/api/:module', async (req, res, next) => {
  const moduleInfo = resolveModule(req.params.module);
  if (!moduleInfo) return res.status(404).json({ error: 'Unknown module' });

  try {
    await saveModuleData(pool, moduleInfo.table, req.body ?? {});
    return res.status(200).json({ ok: true, module: moduleInfo.moduleKey });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/:module', async (req, res, next) => {
  const moduleInfo = resolveModule(req.params.module);
  if (!moduleInfo) return res.status(404).json({ error: 'Unknown module' });

  try {
    const data = await loadModuleData(pool, moduleInfo.table);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (error?.type === 'encoding.unsupported') {
    return res.status(415).json({ error: 'Unsupported content encoding' });
  }

  if (error?.message?.includes('Insufficient stock')) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
