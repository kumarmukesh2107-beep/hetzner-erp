import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.resolve('uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase();

    cb(null, `${baseName || 'image'}-${Date.now()}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];

  const extension = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = allowedMimeTypes.includes((file.mimetype || '').toLowerCase());
  const isExtensionAllowed = allowedExtensions.includes(extension);

  if (isMimeAllowed && isExtensionAllowed) {
    return cb(null, true);
  }

  return cb(new Error('Only jpg, jpeg, and png files are allowed'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

app.use('/uploads', express.static('uploads'));

app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }

      return res.status(400).json({ error: error.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    return res.status(200).json({
      url: `/uploads/${req.file.filename}`,
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
