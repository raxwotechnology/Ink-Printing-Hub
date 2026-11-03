import asyncHandler from 'express-async-handler';
import Machine from '../models/Machine.js';
import MachineRepair from '../models/MachineRepair.js';
import Expense from '../models/Expense.js';

/**
 * @desc Get all machines
 * @route GET /api/machines
 */
export const getMachines = asyncHandler(async (req, res) => {
    const { search, status, machineType, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { machineCode: { $regex: search, $options: 'i' } },
            { modelNumber: { $regex: search, $options: 'i' } },
            { serialNumber: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
        ];
    }
    if (status) filter.status = status;
    if (machineType) filter.machineType = machineType;

    const skip = (Number(page) - 1) * Number(limit);
    const [machines, total] = await Promise.all([
        Machine.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
        Machine.countDocuments(filter)
    ]);

    res.json({
        success: true,
        count: machines.length,
        total,
        data: machines
    });
});

/**
 * @desc Get machine by ID with its repair history
 * @route GET /api/machines/:id
 */
export const getMachineById = asyncHandler(async (req, res) => {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
        res.status(404);
        throw new Error('Machine not found');
    }

    const repairs = await MachineRepair.find({ machineId: machine._id })
        .sort({ repairDate: -1, createdAt: -1 })
        .populate('createdBy', 'firstName lastName');

    res.json({
        success: true,
        data: {
            ...machine.toObject(),
            repairs
        }
    });
});

/**
 * @desc Create new machine
 * @route POST /api/machines
 */
export const createMachine = asyncHandler(async (req, res) => {
    const machine = await Machine.create({
        ...req.body,
        createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: machine });
});

/**
 * @desc Update machine
 * @route PUT /api/machines/:id
 */
export const updateMachine = asyncHandler(async (req, res) => {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
        res.status(404);
        throw new Error('Machine not found');
    }

    Object.assign(machine, req.body, { updatedBy: req.user._id });
    await machine.save();

    res.json({ success: true, data: machine });
});

/**
 * @desc Delete machine (soft-delete)
 * @route DELETE /api/machines/:id
 */
export const deleteMachine = asyncHandler(async (req, res) => {
    const machine = await Machine.findById(req.params.id);
    if (!machine) {
        res.status(404);
        throw new Error('Machine not found');
    }

    machine.deletedAt = new Date();
    machine.updatedBy = req.user._id;
    await machine.save();

    res.json({ success: true, message: 'Machine deleted successfully' });
});

/**
 * @desc Get all machine repair logs
 * @route GET /api/machine-repairs
 */
export const getMachineRepairs = asyncHandler(async (req, res) => {
    const { machineId, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (machineId) filter.machineId = machineId;
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.repairDate = {};
        if (startDate) filter.repairDate.$gte = new Date(startDate);
        if (endDate) filter.repairDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [repairs, total] = await Promise.all([
        MachineRepair.find(filter)
            .sort({ repairDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('machineId', 'name machineCode brand modelNumber status')
            .populate('createdBy', 'firstName lastName'),
        MachineRepair.countDocuments(filter)
    ]);

    res.json({
        success: true,
        count: repairs.length,
        total,
        data: repairs
    });
});

/**
 * @desc Create a machine repair log and auto-record expense under print_shop
 * @route POST /api/machine-repairs
 */
export const createMachineRepair = asyncHandler(async (req, res) => {
    const {
        machineId,
        repairDate,
        issueDescription,
        diagnosis,
        workDone,
        partsReplaced,
        technicianName,
        technicianPhone,
        serviceCenter,
        partsCost = 0,
        laborCost = 0,
        status = 'completed',
        meterReading,
        notes,
        autoRecordExpense = true,
        paymentMethod = 'cash'
    } = req.body;

    const machine = await Machine.findById(machineId);
    if (!machine) {
        res.status(404);
        throw new Error('Machine not found');
    }

    const totalCost = +(Number(partsCost || 0) + Number(laborCost || 0)).toFixed(2);

    const repair = new MachineRepair({
        machineId,
        repairDate: repairDate || new Date(),
        issueDescription,
        diagnosis,
        workDone,
        partsReplaced: partsReplaced || [],
        technicianName,
        technicianPhone,
        serviceCenter,
        partsCost,
        laborCost,
        totalCost,
        status,
        meterReading,
        notes,
        createdBy: req.user._id
    });

    // Auto-create expense under Print Shop division if cost > 0
    if (autoRecordExpense && totalCost > 0) {
        const expense = new Expense({
            date: repair.repairDate,
            category: 'Machine Repairs & Maintenance',
            amount: totalCost,
            division: 'print_shop',
            paymentMethod,
            reference: machine.machineCode,
            description: `Repair for ${machine.name} (${machine.machineCode}): ${issueDescription}`,
            machineId: machine._id,
            repairId: repair._id,
            createdBy: req.user._id
        });
        await expense.save();
        repair.expenseId = expense._id;
    }

    await repair.save();

    // Update machine status and cumulative repair cost
    machine.totalRepairCost = +(Number(machine.totalRepairCost || 0) + totalCost).toFixed(2);
    machine.lastServicedAt = repair.repairDate;
    if (status === 'in_progress' || status === 'pending') {
        machine.status = 'under_repair';
    } else if (status === 'completed') {
        machine.status = 'operational';
    }
    await machine.save();

    const populated = await MachineRepair.findById(repair._id)
        .populate('machineId', 'name machineCode brand modelNumber status')
        .populate('expenseId');

    res.status(201).json({ success: true, data: populated });
});

/**
 * @desc Update machine repair
 * @route PUT /api/machine-repairs/:id
 */
export const updateMachineRepair = asyncHandler(async (req, res) => {
    const repair = await MachineRepair.findById(req.params.id);
    if (!repair) {
        res.status(404);
        throw new Error('Machine repair not found');
    }

    const oldTotal = repair.totalCost || 0;
    Object.assign(repair, req.body, { updatedBy: req.user._id });
    repair.totalCost = +(Number(repair.partsCost || 0) + Number(repair.laborCost || 0)).toFixed(2);
    await repair.save();

    // Sync expense if exists
    if (repair.expenseId) {
        await Expense.findByIdAndUpdate(repair.expenseId, {
            amount: repair.totalCost,
            date: repair.repairDate,
            description: `Repair: ${repair.issueDescription}`
        });
    }

    // Adjust machine cumulative cost
    const diff = repair.totalCost - oldTotal;
    if (diff !== 0) {
        const machine = await Machine.findById(repair.machineId);
        if (machine) {
            machine.totalRepairCost = +(Number(machine.totalRepairCost || 0) + diff).toFixed(2);
            await machine.save();
        }
    }

    res.json({ success: true, data: repair });
});

/**
 * @desc Delete machine repair
 * @route DELETE /api/machine-repairs/:id
 */
export const deleteMachineRepair = asyncHandler(async (req, res) => {
    const repair = await MachineRepair.findById(req.params.id);
    if (!repair) {
        res.status(404);
        throw new Error('Machine repair not found');
    }

    repair.deletedAt = new Date();
    repair.updatedBy = req.user._id;
    await repair.save();

    // If there was an associated expense, delete it
    if (repair.expenseId) {
        await Expense.findByIdAndUpdate(repair.expenseId, { deletedAt: new Date() });
    }

    // Adjust machine cumulative cost
    const machine = await Machine.findById(repair.machineId);
    if (machine) {
        machine.totalRepairCost = Math.max(0, +(Number(machine.totalRepairCost || 0) - (repair.totalCost || 0)).toFixed(2));
        await machine.save();
    }

    res.json({ success: true, message: 'Machine repair record deleted successfully' });
});
