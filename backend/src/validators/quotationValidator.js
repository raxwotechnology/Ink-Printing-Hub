import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

const quotationLineSchema = z.object({
    productId: objectId.optional(),
    productCode: z.string().optional(),
    productName: z.string().min(1, 'Product name is required'),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01, 'Quantity must be at least 0.01'),
    unitOfMeasure: z.string().optional(),
    unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    taxRate: z.coerce.number().min(0).optional(),
    taxable: z.boolean().optional(),
    notes: z.string().optional(),
});

export const createQuotationSchema = z.object({
    customerId: objectId,
    division: z.enum(['print_shop', 'book_shop']).optional(),
    quotationDate: z.string().optional(),
    validUntil: z.string().optional(),
    currency: z.string().optional(),
    items: z.array(quotationLineSchema).min(1, 'At least one item is required'),
    orderDiscount: z.object({
        type: z.enum(['percentage', 'fixed']),
        value: z.coerce.number().min(0),
    }).optional(),
    shippingCost: z.coerce.number().min(0).optional(),
    otherCharges: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
    termsAndConditions: z.string().optional(),
    status: z.enum(['draft', 'sent']).optional(),
});

export const updateQuotationSchema = createQuotationSchema.partial();

export const changeQuotationStatusSchema = z.object({
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
    reason: z.string().optional(),
});

