import express from 'express';
import { getProfitAndLoss } from '../controllers/financialReportsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'manager', 'accountant'));

router.get('/profit-and-loss', getProfitAndLoss);
router.get('/pnl', getProfitAndLoss);

export default router;
