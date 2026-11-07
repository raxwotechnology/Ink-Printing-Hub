import express from 'express';
import {
    createQuotation,
    getQuotations,
    getQuotationById,
    updateQuotation,
    changeQuotationStatus,
    convertToInvoice,
    deleteQuotation,
} from '../controllers/quotationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createQuotationSchema,
    updateQuotationSchema,
    changeQuotationStatusSchema,
} from '../validators/quotationValidator.js';

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getQuotations)
    .post(
        authorize('admin', 'manager', 'sales_manager', 'accountant', 'sales_rep'),
        validate(createQuotationSchema),
        createQuotation
    );

router
    .route('/:id')
    .get(getQuotationById)
    .put(
        authorize('admin', 'manager', 'sales_manager', 'accountant', 'sales_rep'),
        validate(updateQuotationSchema),
        updateQuotation
    )
    .delete(
        authorize('admin', 'manager', 'sales_manager', 'accountant'),
        deleteQuotation
    );

router.patch(
    '/:id/status',
    authorize('admin', 'manager', 'sales_manager', 'accountant', 'sales_rep'),
    validate(changeQuotationStatusSchema),
    changeQuotationStatus
);

router.post(
    '/:id/convert-to-invoice',
    authorize('admin', 'manager', 'sales_manager', 'accountant'),
    convertToInvoice
);

export default router;

