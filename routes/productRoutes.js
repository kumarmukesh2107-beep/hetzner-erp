import { Router } from 'express';
import { createProduct, getProducts } from '../controllers/productController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

router.get('/products', optionalAuthenticate, getProducts);
router.post('/products', optionalAuthenticate, (req, res, next) => {
  if (req.body && (Array.isArray(req.body.products) || Array.isArray(req.body.categories))) {
    return createProduct(req, res, next);
  }
  return authenticate(req, res, () => createProduct(req, res, next));
});

export default router;
