import { Router } from 'express';
import { createCustomer, getCustomers } from '../controllers/customerController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

router.get('/customers', optionalAuthenticate, getCustomers);
router.post('/customers', optionalAuthenticate, (req, res, next) => {
  if (req.body && Array.isArray(req.body.customers)) return createCustomer(req, res, next);
  return authenticate(req, res, () => createCustomer(req, res, next));
});

export default router;
