import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const machineSchema = new mongoose.Schema({
    machineCode: { type: String, unique: true, trim: true, uppercase: true },
    name: { type: String, required: [true, 'Machine name is required'], trim: true },
    brand: { type: String, trim: true },
    modelNumber: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    machineType: {
        type: String,
        enum: ['digital_printer', 'offset_press', 'plotter', 'riso', 'cutter', 'laminator', 'binder', 'scanner', 'other'],
        default: 'digital_printer'
    },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['operational', 'maintenance_needed', 'under_repair', 'decommissioned'],
        default: 'operational'
    },
    location: { type: String, default: 'Print Shop Floor', trim: true },
    technicianContact: { type: String, trim: true },
    notes: { type: String, trim: true },
    totalRepairCost: { type: Number, default: 0 },
    lastServicedAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

machineSchema.index({ status: 1 });
machineSchema.index({ machineType: 1 });

machineSchema.pre('save', async function () {
    if (this.isNew && !this.machineCode) {
        const seq = await getNextSequence('machine');
        this.machineCode = `MCH-${seq}`;
    }
});

machineSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Machine = mongoose.model('Machine', machineSchema);
export default Machine;
