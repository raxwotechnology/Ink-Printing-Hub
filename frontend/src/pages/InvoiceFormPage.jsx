import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { useInvoice, useCreateInvoice, useUpdateInvoice } from '../features/invoices/useInvoices';

export default function InvoiceFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { data: invoiceRes, isLoading: isLoadingInvoice } = useInvoice(id);
    const existingInvoice = invoiceRes?.data;

    const createMutation = useCreateInvoice();
    const updateMutation = useUpdateInvoice();

    const [customerId, setCustomerId] = useState('');
    const [division, setDivision] = useState('book_shop');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [invoiceType, setInvoiceType] = useState('standard');
    const [notes, setNotes] = useState('');
    const [paymentInstructions, setPaymentInstructions] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [shippingCost, setShippingCost] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState(0);
    const [items, setItems] = useState([{ productName: '', productCode: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0, taxable: false }]);

    // Load existing invoice data in edit mode
    useEffect(() => {
        if (existingInvoice) {
            if (['cancelled', 'void'].includes(existingInvoice.status)) {
                toast.error(`Cannot edit a ${existingInvoice.status} invoice`);
                navigate(`/invoices/${existingInvoice._id}`);
                return;
            }
            setCustomerId(existingInvoice.customerId?._id || existingInvoice.customerId || '');
            setDivision(existingInvoice.division || 'book_shop');
            if (existingInvoice.invoiceDate) {
                setInvoiceDate(new Date(existingInvoice.invoiceDate).toISOString().split('T')[0]);
            }
            if (existingInvoice.dueDate) {
                setDueDate(new Date(existingInvoice.dueDate).toISOString().split('T')[0]);
            }
            setInvoiceType(existingInvoice.invoiceType || 'standard');
            setNotes(existingInvoice.notes || '');
            setPaymentInstructions(existingInvoice.paymentInstructions || '');
            setTermsAndConditions(existingInvoice.termsAndConditions || '');
            setShippingCost(existingInvoice.shippingCost || 0);
            setOtherCharges(existingInvoice.otherCharges || 0);

            if (existingInvoice.orderDiscount) {
                setDiscountType(existingInvoice.orderDiscount.type || 'percentage');
                setDiscountValue(existingInvoice.orderDiscount.value || 0);
            }

            if (existingInvoice.items?.length > 0) {
                setItems(existingInvoice.items.map((i) => ({
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
    }, [existingInvoice, navigate]);

    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', division],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });

    const customerOptions = (customersData?.data || []).map((c) => ({
        value: c._id, label: `${c.displayName} (${c.customerCode || 'No Code'})`,
    }));
    const productOptions = (productsData?.data || []).map((p) => ({
        value: p._id, label: `${p.name} — ${p.productCode || ''} (LKR ${p.basePrice || 0})`,
    }));

    const addItem = () => setItems([...items, { productName: '', productCode: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0, taxable: false }]);
    const removeItem = (idx) => {
        if (items.length <= 1) {
            toast.error('Invoice must have at least one line item');
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

    const totals = useMemo(() => {
        let sub = 0;
        let lineDiscSum = 0;
        let taxSum = 0;

        items.forEach((i) => {
            const q = Math.max(0, +i.quantity || 0);
            const p = Math.max(0, +i.unitPrice || 0);
            const lineSub = +(q * p).toFixed(2);
            const disc = +(lineSub * (+i.discountPercent || 0) / 100).toFixed(2);
            const taxable = i.taxable ? Math.max(0, lineSub - disc) : 0;
            const tax = +(taxable * (+i.taxRate || 0) / 100).toFixed(2);

            sub += lineSub;
            lineDiscSum += disc;
            taxSum += tax;
        });

        const netBeforeOrderDisc = Math.max(0, sub - lineDiscSum);
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
            sub: +sub.toFixed(2),
            lineDiscount: +lineDiscSum.toFixed(2),
            orderDiscount: +orderDiscAmount.toFixed(2),
            totalDiscount: +(lineDiscSum + orderDiscAmount).toFixed(2),
            totalTax: +taxSum.toFixed(2),
            grand: +grand.toFixed(2)
        };
    }, [items, shippingCost, otherCharges, discountType, discountValue]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async () => {
        if (!customerId) { toast.error('Please select a customer'); return; }
        if (items.length === 0 || items.some((i) => !i.productName?.trim() || !i.quantity)) {
            toast.error('All items need a valid name and quantity');
            return;
        }

        const payload = {
            customerId,
            division,
            invoiceType,
            invoiceDate,
            dueDate: dueDate || undefined,
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
            orderDiscount: +discountValue > 0 ? { type: discountType, value: +discountValue } : undefined,
            shippingCost: +shippingCost || 0,
            otherCharges: +otherCharges || 0,
            notes: notes || undefined,
            paymentInstructions: paymentInstructions || undefined,
            termsAndConditions: termsAndConditions || undefined,
            status: isEditMode ? undefined : 'approved',
        };

        try {
            if (isEditMode) {
                const result = await updateMutation.mutateAsync({ id, data: payload });
                navigate(`/invoices/${result.data._id}`);
            } else {
                const result = await createMutation.mutateAsync(payload);
                navigate(`/invoices/${result.data._id}`);
            }
        } catch { }
    };

    if (isEditMode && isLoadingInvoice) {
        return <div className="py-16 text-center text-gray-500">Loading invoice data...</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEditMode ? `Edit Invoice (${existingInvoice?.invoiceNumber || ''})` : 'New Invoice'}
                description={isEditMode ? 'Modify invoice line items, pricing, or terms' : 'Create an invoice (products, custom printing services, or books)'}
                actions={
                    <Button variant="outline" onClick={() => navigate(isEditMode ? `/invoices/${id}` : '/invoices')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b pb-2">Customer & Billing Details</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label="Customer"
                                    required
                                    placeholder="Select customer..."
                                    options={customerOptions}
                                    value={customerId}
                                    onChange={(e) => setCustomerId(e.target.value)}
                                />
                                <Select
                                    label="Operating Division"
                                    required
                                    options={[
                                        { value: 'book_shop', label: 'Pothmela (Book Shop)' },
                                        { value: 'print_shop', label: 'Ink Printing Hub (Print Shop)' },
                                    ]}
                                    value={division}
                                    onChange={(e) => setDivision(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input label="Invoice Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                                <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                <Select
                                    label="Type"
                                    options={[
                                        { value: 'standard', label: 'Standard' },
                                        { value: 'proforma', label: 'Proforma' },
                                        { value: 'service', label: 'Service' },
                                    ]}
                                    value={invoiceType}
                                    onChange={(e) => setInvoiceType(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
                                <p className="text-xs text-gray-500">Add catalog products, custom jobs, or services</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                                                    placeholder="Description or item name"
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
                                                label="Specification / Description (Optional)"
                                                placeholder="Special details, dimensions, or job notes"
                                                value={item.description || ''}
                                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b pb-2">Notes & Instructions</h3>
                        <div className="space-y-4">
                            <Textarea label="Invoice Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                            <Textarea label="Payment Instructions" rows={2} value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} />
                            <Textarea label="Terms & Conditions" rows={2} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} />
                        </div>
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b pb-2">Invoice Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-mono font-medium">{fmt(totals.sub)}</span>
                            </div>

                            {totals.lineDiscount > 0 && (
                                <div className="flex justify-between text-xs text-emerald-600">
                                    <span>Item Discounts</span>
                                    <span className="font-mono">-{fmt(totals.lineDiscount)}</span>
                                </div>
                            )}

                            <div className="border-t pt-3">
                                <label className="text-xs font-semibold text-gray-700 block mb-1">Overall Discount</label>
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
                                {totals.orderDiscount > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-600">
                                        <span>Order Discount</span>
                                        <span className="font-mono">-{fmt(totals.orderDiscount)}</span>
                                    </div>
                                )}
                            </div>

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

                            <div className="flex justify-between pt-3 border-t-2 border-gray-900 font-bold text-base">
                                <span>Grand Total</span>
                                <span className="text-primary-700 font-mono text-lg">{fmt(totals.grand)}</span>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            fullWidth
                            className="mt-6 justify-center"
                            onClick={submit}
                            loading={createMutation.isPending || updateMutation.isPending}
                            disabled={!customerId || items.length === 0}
                        >
                            <Save size={16} className="mr-1.5" />
                            {isEditMode ? 'Save Changes' : 'Create Invoice'}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
