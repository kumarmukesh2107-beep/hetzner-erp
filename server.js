import cors from 'cors';
import express from 'express';
import mysql from 'mysql2/promise';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 4000);
const uploadsDir = path.join(__dirname, 'uploads');
const API_MODULES = {
  sales: 'sales',
  inventory: 'inventory',
  products: 'products',
  users: 'users',
  purchases: 'purchases',
  contacts: 'contacts',
  expenses: 'expenses',
  accounting: 'accounting',
  payroll: 'payroll',
  companies: 'companies',
  customers: 'customers',
};

const memoryStore = new Map();

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const hasDbConfig = Boolean(dbConfig.host && dbConfig.user && dbConfig.database);
const pool = hasDbConfig
  ? mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
      namedPlaceholders: true,
    })
  : null;

async function ensureTables() {
  if (!pool) return;
  for (const table of Object.values(API_MODULES)) {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`${table}\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

ensureTables().catch(error => {
  console.error('[db] table initialization failed:', error?.message || error);
});

function resolveModule(req) {
  const moduleKey = String(req.params.module || '').toLowerCase();
  const table = API_MODULES[moduleKey];
  if (!table) return null;
  return { moduleKey, table };
}

async function saveModuleData(table, payload) {
  if (!pool) {
    memoryStore.set(table, payload);
    return;
  }
  await pool.execute(`INSERT INTO \`${table}\` (data) VALUES (CAST(? AS JSON))`, [JSON.stringify(payload)]);
}

async function loadModuleData(table) {
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

app.post('/api/:module', async (req, res, next) => {
  const moduleInfo = resolveModule(req);
  if (!moduleInfo) return res.status(404).json({ error: 'Unknown module' });

  try {
    await saveModuleData(moduleInfo.table, req.body ?? {});
    return res.status(200).json({ ok: true, module: moduleInfo.moduleKey });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/:module', async (req, res, next) => {
  const moduleInfo = resolveModule(req);
  if (!moduleInfo) return res.status(404).json({ error: 'Unknown module' });

  try {
    const data = await loadModuleData(moduleInfo.table);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (error?.type === 'encoding.unsupported') {
    return res.status(415).json({ error: 'Unsupported content encoding' });
  }

  return res.status(500).json({ error: 'Internal server error' });
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
