import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, Send } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { useQuotation, useCreateQuotation, useUpdateQuotation } from '../features/quotations/useQuotations';

export default function QuotationFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { data: quotationRes, isLoading: isLoadingQuotation } = useQuotation(id);
    const existingQuotation = quotationRes?.data;

    const createMutation = useCreateQuotation();
    const updateMutation = useUpdateQuotation();

    const [customerId, setCustomerId] = useState('');
    const [division, setDivision] = useState('print_shop');
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
    const [validUntil, setValidUntil] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    });
    const [notes, setNotes] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState(
        '1. Prices quoted are valid until the specified validity date.\n2. Goods once confirmed will be processed according to approved specifications.\n3. Payment terms as agreed.'
    );
    const [shippingCost, setShippingCost] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState(0);
    const [items, setItems] = useState([
        { productName: '', productCode: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0, taxable: false }
    ]);

    // Load existing quotation data in edit mode
    useEffect(() => {
        if (existingQuotation) {
            if (existingQuotation.status === 'converted') {
                toast.error('Converted quotations cannot be edited');
                navigate(`/quotations/${existingQuotation._id}`);
                return;
            }
            setCustomerId(existingQuotation.customerId?._id || existingQuotation.customerId || '');
            setDivision(existingQuotation.division || 'print_shop');
            if (existingQuotation.quotationDate) {
                setQuotationDate(new Date(existingQuotation.quotationDate).toISOString().split('T')[0]);
            }
            if (existingQuotation.validUntil) {
                setValidUntil(new Date(existingQuotation.validUntil).toISOString().split('T')[0]);
            }
            setNotes(existingQuotation.notes || '');
            setTermsAndConditions(existingQuotation.termsAndConditions || '');
            setShippingCost(existingQuotation.shippingCost || 0);
            setOtherCharges(existingQuotation.otherCharges || 0);

            if (existingQuotation.orderDiscount) {
                setDiscountType(existingQuotation.orderDiscount.type || 'percentage');
                setDiscountValue(existingQuotation.orderDiscount.value || 0);
            }

            if (existingQuotation.items?.length > 0) {
                setItems(existingQuotation.items.map((i) => ({
                    productId: i.productId?._id || i.productId || undefined,
                    productName: i.productName || '',
                    productCode: i.productCode || '',
                    description: i.description || '',
                    quantity: i.quantity || 1,
                    unitOfMeasure: i.unitOfMeasure || '',
                    unitPrice: i.unitPrice || 0,
                    discountPercent: i.discountPercent || 0,
                    taxRate: i.taxRate || 0,
                    taxable: Boolean(i.taxable),
                })));
            }
        }
    }, [existingQuotation, navigate]);

    // Fetch active customers and products
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });

    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', division],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });

    const customerOptions = (customersData?.data || []).map((c) => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode || 'No Code'})`,
    }));

    const productOptions = (productsData?.data || []).map((p) => ({
        value: p._id,
        label: `${p.name} — ${p.productCode || ''} (LKR ${p.basePrice || 0})`,
    }));

    const addItem = () => {
        setItems([
            ...items,
            { productName: '', productCode: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0, taxable: false }
        ]);
    };

    const removeItem = (idx) => {
        if (items.length <= 1) {
            toast.error('Quotation must have at least one line item');
            return;
        }
        setItems(items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };

        if (field === 'productId' && value) {
            const p = productsData?.data?.find((x) => x._id === value);
            if (p) {
                newItems[idx].productName = p.name;
                newItems[idx].productCode = p.productCode || '';
                newItems[idx].unitPrice = p.basePrice || 0;
                newItems[idx].unitOfMeasure = p.unitOfMeasure || '';
            }
        }
        setItems(newItems);
    };

    // Live calculation of totals
    const calculatedTotals = useMemo(() => {
        let subtotal = 0;
        let lineDiscountSum = 0;
        let taxSum = 0;

        items.forEach((item) => {
            const qty = Math.max(0, +item.quantity || 0);
            const price = Math.max(0, +item.unitPrice || 0);
            const lineSub = +(qty * price).toFixed(2);
            const disc = +(lineSub * (+item.discountPercent || 0) / 100).toFixed(2);
            const taxableAmount = Math.max(0, lineSub - disc);
            const tax = item.taxable ? +(taxableAmount * (+item.taxRate || 0) / 100).toFixed(2) : 0;

            subtotal += lineSub;
            lineDiscountSum += disc;
            taxSum += tax;
        });

        const netBeforeOrderDisc = Math.max(0, subtotal - lineDiscountSum);
        let orderDiscAmount = 0;
        if (discountType === 'percentage') {
            orderDiscAmount = +(netBeforeOrderDisc * (+discountValue || 0) / 100).toFixed(2);
        } else {
            orderDiscAmount = Math.min(netBeforeOrderDisc, +discountValue || 0);
        }

        const grand = +(
            Math.max(0, netBeforeOrderDisc - orderDiscAmount)
            + taxSum
            + (+shippingCost || 0)
            + (+otherCharges || 0)
        ).toFixed(2);

        return {
            subtotal: +subtotal.toFixed(2),
            lineDiscount: +lineDiscountSum.toFixed(2),
            orderDiscount: +orderDiscAmount.toFixed(2),
            totalDiscount: +(lineDiscountSum + orderDiscAmount).toFixed(2),
            totalTax: +taxSum.toFixed(2),
            grandTotal: grand,
        };
    }, [items, discountType, discountValue, shippingCost, otherCharges]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const handleSubmit = async (targetStatus = 'draft') => {
        if (!customerId) {
            toast.error('Please select a customer');
            return;
        }

        if (items.length === 0 || items.some((i) => !i.productName?.trim() || !i.quantity)) {
            toast.error('All items must have a valid name and quantity');
            return;
        }

        const payload = {
            customerId,
            division,
            quotationDate,
            validUntil,
            items: items.map((i) => ({
                productId: i.productId || undefined,
                productCode: i.productCode || undefined,
                productName: i.productName.trim(),
                description: i.description || undefined,
                quantity: +i.quantity,
                unitOfMeasure: i.unitOfMeasure || undefined,
                unitPrice: +i.unitPrice,
                discountPercent: +i.discountPercent || 0,
                taxRate: +i.taxRate || 0,
                taxable: Boolean(i.taxable),
            })),
            orderDiscount: +discountValue > 0 ? {
                type: discountType,
                value: +discountValue,
            } : undefined,
            shippingCost: +shippingCost || 0,
            otherCharges: +otherCharges || 0,
            notes: notes || undefined,
            termsAndConditions: termsAndConditions || undefined,
            status: targetStatus,
        };

        try {
            if (isEditMode) {
                const res = await updateMutation.mutateAsync({ id, data: payload });
                navigate(`/quotations/${res.data._id}`);
            } else {
                const res = await createMutation.mutateAsync(payload);
                navigate(`/quotations/${res.data._id}`);
            }
        } catch {
            // error handled by mutation hook
        }
    };

    if (isEditMode && isLoadingQuotation) {
        return <div className="py-16 text-center text-gray-500">Loading quotation...</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEditMode ? `Edit Quotation (${existingQuotation?.quotationNumber || ''})` : 'New Price Quotation'}
                description={isEditMode ? 'Modify quotation items and pricing' : 'Create a formal price quotation for a customer'}
                actions={
                    <Button variant="outline" onClick={() => navigate(isEditMode ? `/quotations/${id}` : '/quotations')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form: Items and Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer & General Metadata */}
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b pb-2">
                            Customer & Quotation Details
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label="Customer"
                                    required
                                    placeholder="Select a customer..."
                                    options={customerOptions}
                                    value={customerId}
                                    onChange={(e) => setCustomerId(e.target.value)}
                                />

                                <Select
                                    label="Operating Division"
                                    required
                                    options={[
                                        { value: 'print_shop', label: 'Ink Printing Hub (Print Shop)' },
                                        { value: 'book_shop', label: 'Pothmela (Book Shop)' },
                                    ]}
                                    value={division}
                                    onChange={(e) => setDivision(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Quotation Date"
                                    type="date"
                                    value={quotationDate}
                                    onChange={(e) => setQuotationDate(e.target.value)}
                                />

                                <Input
                                    label="Valid Until"
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Quotation Line Items */}
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Quotation Line Items</h3>
                                <p className="text-xs text-gray-500">Add products, custom printing services, or bookshop goods</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={addItem}>
                                <Plus size={14} className="mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, idx) => {
                                const qty = +item.quantity || 0;
                                const price = +item.unitPrice || 0;
                                const sub = qty * price;
                                const disc = sub * (+item.discountPercent || 0) / 100;
                                const lineTotal = Math.max(0, sub - disc);

                                return (
                                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500">Item #{idx + 1}</span>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-1">
                                                <Select
                                                    label="Select Catalog Item (Optional)"
                                                    placeholder="Search catalog..."
                                                    options={productOptions}
                                                    value={item.productId || ''}
                                                    onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <Input
                                                    label="Item / Service Name"
                                                    required
                                                    placeholder="e.g. 500x Business Cards, Hardcover Notebook..."
                                                    value={item.productName}
                                                    onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                                            <div>
                                                <Input
                                                    label="Quantity"
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    label="UOM"
                                                    placeholder="pcs, sets..."
                                                    value={item.unitOfMeasure || ''}
                                                    onChange={(e) => updateItem(idx, 'unitOfMeasure', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    label="Unit Price (LKR)"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    label="Discount %"
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    value={item.discountPercent || ''}
                                                    onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)}
                                                />
                                            </div>
                                            <div className="text-right pb-2">
                                                <span className="text-[11px] text-gray-500 block">Line Total</span>
                                                <span className="font-mono font-bold text-gray-900 text-sm">
                                                    {fmt(lineTotal)}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <Input
                                                label="Specification / Description / Notes (Optional)"
                                                placeholder="e.g. 350gsm art card, matte lamination, spot UV on logo"
                                                value={item.description || ''}
                                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Notes & Terms */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                            Terms & Quotation Notes
                        </h3>
                        <Textarea
                            label="Notes / Remarks for Customer"
                            rows={3}
                            placeholder="Add special instructions, job specifications, or polite remarks..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />

                        <Textarea
                            label="Terms & Conditions"
                            rows={3}
                            placeholder="Quotation validity, payment terms, delivery conditions..."
                            value={termsAndConditions}
                            onChange={(e) => setTermsAndConditions(e.target.value)}
                        />
                    </Card>
                </div>

                {/* Sidebar: Totals Summary & Actions */}
                <div className="space-y-6">
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b pb-2">
                            Quotation Summary
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-mono font-medium">{fmt(calculatedTotals.subtotal)}</span>
                            </div>

                            {calculatedTotals.lineDiscount > 0 && (
                                <div className="flex justify-between text-emerald-600 text-xs">
                                    <span>Item Discounts</span>
                                    <span className="font-mono">-{fmt(calculatedTotals.lineDiscount)}</span>
                                </div>
                            )}

                            {/* Order Level Discount */}
                            <div className="border-t pt-3">
                                <label className="text-xs font-semibold text-gray-700 block mb-1">
                                    Overall Quotation Discount
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <div className="w-28">
                                        <Select
                                            options={[
                                                { value: 'percentage', label: '%' },
                                                { value: 'fixed', label: 'Fixed LKR' },
                                            ]}
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0"
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {calculatedTotals.orderDiscount > 0 && (
                                    <div className="flex justify-between text-emerald-600 text-xs">
                                        <span>Order Discount</span>
                                        <span className="font-mono">-{fmt(calculatedTotals.orderDiscount)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Additional charges */}
                            <div className="border-t pt-3 space-y-2">
                                <div>
                                    <Input
                                        label="Shipping / Delivery (LKR)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Other Handling Charges (LKR)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={otherCharges}
                                        onChange={(e) => setOtherCharges(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-baseline">
                                <span className="font-bold text-gray-900 text-base">Grand Total</span>
                                <span className="font-bold font-mono text-primary-700 text-lg">
                                    {fmt(calculatedTotals.grandTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="mt-6 space-y-2 pt-4 border-t">
                            <Button
                                variant="primary"
                                className="w-full justify-center"
                                loading={createMutation.isPending || updateMutation.isPending}
                                onClick={() => handleSubmit('draft')}
                            >
                                <Save size={16} className="mr-1.5" />
                                {isEditMode ? 'Update Quotation' : 'Save as Draft'}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full justify-center"
                                loading={createMutation.isPending || updateMutation.isPending}
                                onClick={() => handleSubmit('sent')}
                            >
                                <Send size={16} className="mr-1.5" />
                                Save & Mark as Sent
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

