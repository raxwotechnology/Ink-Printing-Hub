import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const addressSnapshotSchema = new mongoose.Schema({
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    phone: String,
}, { _id: false });

const quotationLineItemSchema = new mongoose.Schema({
    lineNumber: Number,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productCode: String,
    productName: { type: String, required: true },
    description: String,

    quantity: { type: Number, required: true, min: 0.01 },
    unitOfMeasure: String,
    unitPrice: { type: Number, required: true, min: 0 },

    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },

    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxable: { type: Boolean, default: false },

    lineSubtotal: { type: Number, default: 0 },
    lineDiscount: { type: Number, default: 0 },
    lineTax: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },

    notes: String,
}, { _id: true });

const quotationSchema = new mongoose.Schema({
    quotationNumber: { type: String, unique: true, trim: true, uppercase: true },

    division: {
        type: String,
        enum: ['print_shop', 'book_shop'],
        default: 'print_shop',
        index: true,
    },
    divisionSnapshot: {
        name: String,
        address: String,
        phone: String,
        email: String,
        website: String,
        taxRegistrationNumber: String,
        logoUrl: String,
        tagline: String,
    },

    // Customer
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerSnapshot: {
        name: String,
        code: String,
        taxRegistrationNumber: String,
        contactName: String,
        phone: String,
        email: String,
    },

    // Addresses
    billingAddress: addressSnapshotSchema,
    shippingAddress: addressSnapshotSchema,

    // Dates
    quotationDate: { type: Date, default: Date.now },
    validUntil: { type: Date },

    // Currency
    currency: { type: String, default: 'LKR' },

    // Assignment
    salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Line items
    items: [quotationLineItemSchema],

    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    orderDiscount: {
        type: { type: String, enum: ['percentage', 'fixed'] },
        value: Number,
        amount: Number,
    },
    totalTax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // Status: draft -> sent -> accepted / rejected / expired -> converted
    status: {
        type: String,
        enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
        default: 'draft',
        index: true,
    },

    sentAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,

    // Conversion to invoice tracking
    convertedToInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    convertedAt: Date,
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: String,
    termsAndConditions: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

quotationSchema.index({ customerId: 1, quotationDate: -1 });
quotationSchema.index({ status: 1, quotationDate: -1 });
quotationSchema.index({ division: 1, quotationDate: -1 });
quotationSchema.index({ deletedAt: 1, quotationDate: -1 });

quotationSchema.pre('save', async function () {
    // Generate distinct quotation number sequence
    if (this.isNew && !this.quotationNumber) {
        const prefix = this.division === 'book_shop' ? 'PB' : 'IPH';
        const seq = await getNextSequence(`quotation_${this.division || 'print_shop'}`);
        this.quotationNumber = `${prefix}-QUO-${seq}`;
    }

    // Default validUntil to 14 days after quotationDate if not provided
    if (!this.validUntil) {
        const base = this.quotationDate ? new Date(this.quotationDate) : new Date();
        const v = new Date(base);
        v.setDate(v.getDate() + 14);
        this.validUntil = v;
    }

    // Calculate line totals
    this.items.forEach((item, idx) => {
        item.lineNumber = idx + 1;
        item.lineSubtotal = +(item.quantity * item.unitPrice).toFixed(2);
        const discFromPct = item.lineSubtotal * (item.discountPercent || 0) / 100;
        item.lineDiscount = +(discFromPct + (item.discountAmount || 0)).toFixed(2);
        const taxable = Math.max(0, item.lineSubtotal - item.lineDiscount);
        item.lineTax = item.taxable ? +(taxable * (item.taxRate || 0) / 100).toFixed(2) : 0;
        item.taxAmount = item.lineTax;
        item.lineTotal = +(taxable + item.lineTax).toFixed(2);
    });

    this.subtotal = +this.items.reduce((s, i) => s + i.lineSubtotal, 0).toFixed(2);
    this.totalDiscount = +this.items.reduce((s, i) => s + i.lineDiscount, 0).toFixed(2);
    this.totalTax = +this.items.reduce((s, i) => s + i.lineTax, 0).toFixed(2);

    let orderLevelDiscount = 0;
    if (this.orderDiscount?.type === 'percentage') {
        const netBeforeOrderDisc = Math.max(0, this.subtotal - this.totalDiscount);
        orderLevelDiscount = +(netBeforeOrderDisc * (this.orderDiscount.value || 0) / 100).toFixed(2);
    } else if (this.orderDiscount?.type === 'fixed') {
        orderLevelDiscount = +(this.orderDiscount.value || 0).toFixed(2);
    }
    if (this.orderDiscount) this.orderDiscount.amount = orderLevelDiscount;

    this.grandTotal = +(
        Math.max(0, this.subtotal - this.totalDiscount - orderLevelDiscount)
        + this.totalTax
        + (this.shippingCost || 0)
        + (this.otherCharges || 0)
    ).toFixed(2);
});

quotationSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;

