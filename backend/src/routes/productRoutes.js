import express from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    getProductByBarcode,
    updateProduct,
    deleteProduct,
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getProducts)
    .post(authorize('admin', 'manager'), validate(createProductSchema), createProduct);

// Dedicated POS Barcode lookup route
router.get('/barcode/:barcode', getProductByBarcode);

router
    .route('/:id')
    .get(getProductById)
    .put(authorize('admin', 'manager'), validate(updateProductSchema), updateProduct)
    .delete(authorize('admin', 'manager'), deleteProduct);

export default router;