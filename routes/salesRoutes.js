import { Router } from 'express';
import { createSale, getSales } from '../controllers/salesController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

router.get('/sales', optionalAuthenticate, getSales);
router.post('/sales', optionalAuthenticate, (req, res, next) => {
  if (req.body && (Array.isArray(req.body.sales) || Array.isArray(req.body.salesLogs))) {
    return createSale(req, res, next);
  }
  return authenticate(req, res, () => createSale(req, res, next));
});

export default router;
