import cors from 'cors';
import express from 'express';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 4000);
const uploadsDir = path.join(__dirname, 'uploads');

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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
