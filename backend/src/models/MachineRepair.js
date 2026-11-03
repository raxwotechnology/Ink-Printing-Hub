import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const machineRepairSchema = new mongoose.Schema({
    repairCode: { type: String, unique: true, trim: true, uppercase: true },
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: [true, 'Machine is required'] },
    repairDate: { type: Date, required: true, default: Date.now },
    issueDescription: { type: String, required: [true, 'Issue description is required'], trim: true },
    diagnosis: { type: String, trim: true },
    workDone: { type: String, trim: true },
    partsReplaced: [{
        partName: { type: String, trim: true },
        quantity: { type: Number, default: 1 },
        cost: { type: Number, default: 0 }
    }],
    technicianName: { type: String, trim: true },
    technicianPhone: { type: String, trim: true },
    serviceCenter: { type: String, trim: true },
    partsCost: { type: Number, default: 0, min: 0 },
    laborCost: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'completed'
    },
    meterReading: { type: Number },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
    notes: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

machineRepairSchema.index({ machineId: 1, repairDate: -1 });
machineRepairSchema.index({ status: 1 });

machineRepairSchema.pre('save', async function () {
    if (this.isNew && !this.repairCode) {
        const seq = await getNextSequence('machine_repair');
        this.repairCode = `REP-${seq}`;
    }
    this.totalCost = +(Number(this.partsCost || 0) + Number(this.laborCost || 0)).toFixed(2);
});

machineRepairSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const MachineRepair = mongoose.model('MachineRepair', machineRepairSchema);
export default MachineRepair;
