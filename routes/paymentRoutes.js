import { Router } from 'express';
import { createPayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/payments', authenticate, createPayment);

export default router;
