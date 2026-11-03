import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    getMachines,
    getMachineById,
    createMachine,
    updateMachine,
    deleteMachine,
    getMachineRepairs,
    createMachineRepair,
    updateMachineRepair,
    deleteMachineRepair
} from '../controllers/machineController.js';

const router = express.Router();

// Machine routes
router.route('/machines')
    .get(protect, getMachines)
    .post(protect, authorize('admin', 'manager', 'production_staff'), createMachine);

router.route('/machines/:id')
    .get(protect, getMachineById)
    .put(protect, authorize('admin', 'manager', 'production_staff'), updateMachine)
    .delete(protect, authorize('admin', 'manager'), deleteMachine);

// Machine repairs routes
router.route('/machine-repairs')
    .get(protect, getMachineRepairs)
    .post(protect, authorize('admin', 'manager', 'production_staff'), createMachineRepair);

router.route('/machine-repairs/:id')
    .put(protect, authorize('admin', 'manager', 'production_staff'), updateMachineRepair)
    .delete(protect, authorize('admin', 'manager'), deleteMachineRepair);

export default router;
