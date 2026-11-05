import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const employeeSchema = new mongoose.Schema({
    employeeCode: { type: String, unique: true, trim: true, uppercase: true },

    // Optional linked user account (for system login)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Personal info
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    displayName: { type: String, trim: true },
    fullName: String, // auto-computed

    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    dateOfBirth: Date,
    nationalIdNumber: { type: String, trim: true }, // NIC in Sri Lanka
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed', 'separated'] },
    nationality: { type: String, default: 'Sri Lankan' },
    religion: String,
    bloodGroup: String,

    // Contact
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    mobile: String,
    permanentAddress: {
        line1: String, line2: String, city: String, state: String,
        postalCode: String, country: { type: String, default: 'Sri Lanka' },
    },
    currentAddress: {
        line1: String, line2: String, city: String, state: String,
        postalCode: String, country: { type: String, default: 'Sri Lanka' },
    },

    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        mobile: String,
        address: String,
    },

    // Employment details
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    division: { type: String, enum: ['print_shop', 'book_shop', 'both'], default: 'both' },
    reportsToId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    employmentType: {
        type: String,
        enum: ['permanent', 'contract', 'probation', 'intern', 'part_time', 'consultant'],
        default: 'permanent',
    },

    dateOfJoining: { type: Date, default: Date.now },
    probationEndDate: Date,
    confirmationDate: Date,
    contractEndDate: Date,

    // Work info
    workLocation: { type: String, trim: true }, // Office / factory / warehouse
    workShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

    // Statutory (Sri Lanka specific)
    epfNumber: String, // Employee's EPF number
    etfNumber: String,
    taxRegistrationNumber: String, // TIN

    // Bank (for salary disbursement)
    bankDetails: {
        bankName: String,
        branchName: String,
        accountNumber: String,
        accountName: String,
    },

    // Compensation
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure' },
    basicSalary: { type: Number, default: 0 }, // monthly basic
    commissionRate: { type: Number, default: 0 }, // sales commission percentage
    currency: { type: String, default: 'LKR' },

    // Leave balances (current year)
    leaveBalances: {
        annual: { type: Number, default: 14 }, // default SL standard
        sick: { type: Number, default: 7 },
        casual: { type: Number, default: 7 },
        maternity: { type: Number, default: 84 }, // 12 weeks SL
        paternity: { type: Number, default: 3 },
        unpaid: { type: Number, default: 0 },
    },

    // Skills and qualifications
    skills: [String],
    qualifications: [{
        degree: String,
        institution: String,
        yearOfCompletion: Number,
        grade: String,
    }],

    // Documents (URLs only — upload infra is future)
    documents: [{
        type: { type: String }, // 'id_copy', 'contract', 'certificate', etc.
        title: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
    }],

    // Status
    status: {
        type: String,
        enum: ['active', 'on_leave', 'probation', 'suspended', 'terminated', 'resigned', 'retired'],
        default: 'active',
    },

    dateOfExit: Date,
    exitReason: String,

    photoUrl: String,

    notes: String,
    internalNotes: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

employeeSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
employeeSchema.index({ departmentId: 1, status: 1 });
employeeSchema.index({ designationId: 1 });
employeeSchema.index({ userId: 1 });
employeeSchema.index({ nationalIdNumber: 1 });
employeeSchema.index({ status: 1 });

employeeSchema.pre('save', async function () {
    if (this.isNew && !this.employeeCode) {
        const seq = await getNextSequence('employee');
        this.employeeCode = `EMP-${seq}`;
    }
    this.fullName = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    if (!this.displayName) this.displayName = this.fullName;
});

employeeSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;