import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import CompanySettings from '../models/CompanySettings.js';
import { updateCustomerBalance } from './invoiceController.js';

/**
 * POST /api/quotations
 * Create a new quotation
 */
export const createQuotation = asyncHandler(async (req, res) => {
    const { customerId, items, division, quotationDate, validUntil, ...rest } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    const targetDivision = division || 'print_shop';
    const settings = await CompanySettings.findOne();
    const divConfig = settings?.divisions?.[targetDivision] || {
        name: targetDivision === 'print_shop' ? 'Ink Printing Hub (pvt) Ltd' : 'Pothmela Book Shop',
        address: settings?.address || '',
        phone: settings?.phone || '',
        email: settings?.email || '',
        taxRegistrationNumber: settings?.taxRegistrationNumber || '',
        logoUrl: settings?.divisions?.[targetDivision]?.logoUrl || settings?.logoUrl || '',
        tagline: targetDivision === 'print_shop'
            ? 'PREMIUM QUALITY PRINTING & BRANDING SOLUTIONS'
            : 'YOUR TRUSTED BOOKSTORE & STATIONERY HUB',
    };

    let calculatedValidUntil = validUntil;
    if (!calculatedValidUntil) {
        const base = quotationDate ? new Date(quotationDate) : new Date();
        const v = new Date(base);
        v.setDate(v.getDate() + 14); // 14 days default validity
        calculatedValidUntil = v;
    }

    const quotation = new Quotation({
        division: targetDivision,
        divisionSnapshot: divConfig,
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
            phone: customer.primaryContact?.phone,
            email: customer.primaryContact?.email,
        },
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddresses?.find((a) => a.isDefault) || customer.billingAddress,
        salesRepId: customer.assignedSalesRep,
        quotationDate: quotationDate || new Date(),
        validUntil: calculatedValidUntil,
        items,
        ...rest,
        createdBy: req.user._id,
    });

    await quotation.save();

    const populated = await Quotation.findById(quotation._id)
        .populate('customerId', 'displayName customerCode primaryContact billingAddress')
        .populate('salesRepId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, data: populated });
});

/**
 * GET /api/quotations
 * List quotations with filters and pagination
 */
export const getQuotations = asyncHandler(async (req, res) => {
    const {
        search,
        customerId,
        status,
        division,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'quotationDate',
        sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (division && division !== 'all') {
        filter.division = division;
    }

    if (search) {
        filter.$or = [
            { quotationNumber: { $regex: search, $options: 'i' } },
            { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
            { 'customerSnapshot.code': { $regex: search, $options: 'i' } },
        ];
    }

    if (customerId) filter.customerId = customerId;
    if (status && status !== 'all') filter.status = status;

    if (startDate || endDate) {
        filter.quotationDate = {};
        if (startDate) filter.quotationDate.$gte = new Date(startDate);
        if (endDate) filter.quotationDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [quotations, total] = await Promise.all([
        Quotation.find(filter)
            .populate('customerId', 'displayName customerCode')
            .populate('salesRepId', 'firstName lastName')
            .populate('convertedToInvoiceId', 'invoiceNumber grandTotal paymentStatus')
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit)),
        Quotation.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: quotations.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: quotations,
    });
});

/**
 * GET /api/quotations/:id
 * Get single quotation details
 */
export const getQuotationById = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
        .populate('customerId', 'displayName customerCode taxRegistrationNumber primaryContact billingAddress shippingAddresses paymentTerms')
        .populate('salesRepId', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('convertedBy', 'firstName lastName')
        .populate('convertedToInvoiceId', 'invoiceNumber grandTotal paymentStatus invoiceDate balanceDue');

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    res.json({ success: true, data: quotation });
});

/**
 * PUT /api/quotations/:id
 * Update quotation
 */
export const updateQuotation = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    if (quotation.status === 'converted') {
        res.status(400);
        throw new Error('Converted quotations cannot be modified');
    }

    const { customerId, items, division, quotationDate, validUntil, ...rest } = req.body;

    if (customerId && customerId.toString() !== quotation.customerId.toString()) {
        const customer = await Customer.findById(customerId);
        if (!customer) {
            res.status(404);
            throw new Error('Customer not found');
        }
        quotation.customerId = customer._id;
        quotation.customerSnapshot = {
            name: customer.displayName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
            phone: customer.primaryContact?.phone,
            email: customer.primaryContact?.email,
        };
        quotation.billingAddress = customer.billingAddress;
        quotation.shippingAddress = customer.shippingAddresses?.find((a) => a.isDefault) || customer.billingAddress;
        quotation.salesRepId = customer.assignedSalesRep;
    }

    if (division) quotation.division = division;
    if (quotationDate) quotation.quotationDate = quotationDate;
    if (validUntil) quotation.validUntil = validUntil;
    if (items) quotation.items = items;

    // Assign other properties
    Object.assign(quotation, rest);
    quotation.updatedBy = req.user._id;

    await quotation.save();

    const updated = await Quotation.findById(quotation._id)
        .populate('customerId', 'displayName customerCode primaryContact billingAddress')
        .populate('salesRepId', 'firstName lastName')
        .populate('convertedToInvoiceId', 'invoiceNumber grandTotal paymentStatus');

    res.json({ success: true, data: updated });
});

/**
 * PATCH /api/quotations/:id/status
 * Change quotation status
 */
export const changeQuotationStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    if (quotation.status === 'converted') {
        res.status(400);
        throw new Error('Cannot change status of a converted quotation');
    }

    const allowedTransitions = {
        draft: ['sent', 'accepted', 'rejected', 'expired'],
        sent: ['draft', 'accepted', 'rejected', 'expired'],
        accepted: ['rejected', 'draft'],
        rejected: ['draft'],
        expired: ['draft'],
    };

    if (!allowedTransitions[quotation.status]?.includes(status)) {
        res.status(400);
        throw new Error(`Cannot change status from '${quotation.status}' to '${status}'`);
    }

    quotation.status = status;
    quotation.updatedBy = req.user._id;

    if (status === 'sent') quotation.sentAt = new Date();
    if (status === 'accepted') quotation.acceptedAt = new Date();
    if (status === 'rejected') {
        quotation.rejectedAt = new Date();
        quotation.rejectionReason = reason || '';
    }

    await quotation.save();

    res.json({ success: true, data: quotation });
});

/**
 * POST /api/quotations/:id/convert-to-invoice
 * Convert quotation to invoice:
 * - Preserves the quotation as 'converted' with link to invoice
 * - Generates a new invoice with its own distinct INV sequence
 */
export const convertToInvoice = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    if (quotation.status === 'converted' || quotation.convertedToInvoiceId) {
        res.status(400);
        throw new Error('Quotation has already been converted to an invoice');
    }

    const customer = await Customer.findById(quotation.customerId);
    if (!customer) {
        res.status(404);
        throw new Error('Customer associated with quotation not found');
    }

    // Determine due date based on payment terms if not explicitly supplied
    let invoiceDueDate = req.body.dueDate;
    const invDate = req.body.invoiceDate ? new Date(req.body.invoiceDate) : new Date();
    if (!invoiceDueDate && customer.paymentTerms?.type === 'credit') {
        const d = new Date(invDate);
        d.setDate(d.getDate() + (customer.paymentTerms.creditDays || 0));
        invoiceDueDate = d;
    }

    // Build the new invoice
    const invoice = new Invoice({
        division: quotation.division,
        divisionSnapshot: quotation.divisionSnapshot,
        customerId: quotation.customerId,
        customerSnapshot: quotation.customerSnapshot,
        billingAddress: quotation.billingAddress,
        shippingAddress: quotation.shippingAddress,
        salesRepId: quotation.salesRepId,
        invoiceDate: invDate,
        dueDate: invoiceDueDate,
        currency: quotation.currency || 'LKR',
        items: quotation.items.map((i) => ({
            productId: i.productId,
            productCode: i.productCode,
            productName: i.productName,
            description: i.description,
            quantity: i.quantity,
            unitOfMeasure: i.unitOfMeasure,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
            discountAmount: i.discountAmount,
            taxRate: i.taxRate,
            taxable: i.taxable,
            notes: i.notes,
        })),
        orderDiscount: quotation.orderDiscount,
        shippingCost: quotation.shippingCost,
        otherCharges: quotation.otherCharges,
        notes: (req.body.notes ? req.body.notes + '\n\n' : '') + `Converted from Quotation: ${quotation.quotationNumber}`,
        termsAndConditions: quotation.termsAndConditions,
        status: req.body.status || 'approved',
        paymentTerms: {
            type: customer.paymentTerms?.type || 'cod',
            creditDays: customer.paymentTerms?.creditDays || 0,
        },
        createdBy: req.user._id,
    });

    await invoice.save();
    await updateCustomerBalance(customer._id);

    // Update the quotation to reflect the conversion without altering its original data
    quotation.status = 'converted';
    quotation.convertedToInvoiceId = invoice._id;
    quotation.convertedAt = new Date();
    quotation.convertedBy = req.user._id;
    quotation.updatedBy = req.user._id;
    await quotation.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('customerId', 'displayName customerCode')
        .populate('createdBy', 'firstName lastName');

    res.status(201).json({
        success: true,
        message: `Quotation ${quotation.quotationNumber} successfully converted to invoice ${invoice.invoiceNumber}`,
        data: {
            quotation,
            invoice: populatedInvoice,
        },
    });
});

/**
 * DELETE /api/quotations/:id
 * Soft delete a quotation
 */
export const deleteQuotation = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    if (quotation.status === 'converted') {
        res.status(400);
        throw new Error('Cannot delete a quotation that has been converted to an invoice');
    }

    quotation.deletedAt = new Date();
    quotation.updatedBy = req.user._id;
    await quotation.save();

    res.json({ success: true, message: 'Quotation deleted successfully', data: quotation });
});

