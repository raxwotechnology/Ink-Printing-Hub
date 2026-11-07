import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Printer, Edit, FileCheck, Send, CheckCircle,
    XCircle, Clock, AlertTriangle, ArrowRight, Trash2
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PrintableQuotation from '../components/print/PrintableQuotation';

import {
    useQuotation,
    useChangeQuotationStatus,
    useConvertToInvoice,
    useDeleteQuotation,
} from '../features/quotations/useQuotations';
import { useAuthStore } from '../store/authStore';

const quotationStatusVariant = {
    draft: 'default',
    sent: 'info',
    accepted: 'success',
    rejected: 'danger',
    expired: 'warning',
    converted: 'primary',
};

export default function QuotationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const printRef = useRef();

    const { data, isLoading } = useQuotation(id);
    const quotation = data?.data;

    const changeStatus = useChangeQuotationStatus();
    const convertToInvoice = useConvertToInvoice();
    const deleteMutation = useDeleteQuotation();

    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [statusAction, setStatusAction] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    if (isLoading || !quotation) {
        return <div className="py-16 text-center text-gray-500">Loading quotation details...</div>;
    }

    const canEdit = ['admin', 'manager', 'sales_manager', 'sales_rep', 'accountant'].includes(user?.role);
    const isConverted = quotation.status === 'converted' || Boolean(quotation.convertedToInvoiceId);
    const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date() && !isConverted && quotation.status !== 'accepted';

    const handlePrint = () => {
        window.print();
    };

    const handleStatusUpdate = async (status, reason) => {
        await changeStatus.mutateAsync({ id: quotation._id, status, reason });
        setStatusAction(null);
        setRejectReason('');
    };

    const handleConfirmConvert = async () => {
        try {
            const res = await convertToInvoice.mutateAsync({
                id: quotation._id,
                data: {
                    notes: `Converted from Quotation ${quotation.quotationNumber}`,
                },
            });
            setIsConvertDialogOpen(false);
            const createdInvoiceId = res?.data?.invoice?._id;
            if (createdInvoiceId) {
                navigate(`/invoices/${createdInvoiceId}`);
            }
        } catch {
            // Error handled by mutation hook
        }
    };

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(quotation._id);
        navigate('/quotations');
    };

    const customer = quotation.customerSnapshot || {};
    const billing = quotation.billingAddress || {};
    const items = quotation.items || [];

    return (
        <div className="space-y-6">
            {/* Top Navigation & Action Header (Hidden in Print) */}
            <div className="no-print">
                <PageHeader
                    title={
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-2xl font-bold text-gray-900">{quotation.quotationNumber}</span>
                            <Badge variant={quotationStatusVariant[quotation.status] || 'default'}>
                                {quotation.status ? quotation.status.toUpperCase() : 'DRAFT'}
                            </Badge>
                            {isExpired && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    <Clock size={12} className="mr-1" /> EXPIRED
                                </span>
                            )}
                        </div>
                    }
                    description={`Created on ${fmtDate(quotation.quotationDate)} • Operating Division: ${quotation.division === 'print_shop' ? 'Ink Printing Hub' : 'Pothmela Book Shop'}`}
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => navigate('/quotations')}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back
                            </Button>

                            <Button variant="outline" onClick={handlePrint}>
                                <Printer size={16} className="mr-1.5" /> Print A4 Quotation
                            </Button>

                            {!isConverted && canEdit && (
                                <Button variant="outline" onClick={() => navigate(`/quotations/${quotation._id}/edit`)}>
                                    <Edit size={16} className="mr-1.5" /> Edit
                                </Button>
                            )}

                            {!isConverted && canEdit && (
                                <Button
                                    variant="primary"
                                    onClick={() => setIsConvertDialogOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <FileCheck size={16} className="mr-1.5" /> Convert to Invoice
                                </Button>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Converted to Invoice Banner (Hidden in Print) */}
            {isConverted && quotation.convertedToInvoiceId && (
                <div className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-emerald-600" size={24} />
                        <div>
                            <p className="font-semibold text-emerald-950">
                                Quotation converted to Invoice {quotation.convertedToInvoiceId.invoiceNumber || ''}
                            </p>
                            <p className="text-xs text-emerald-700">
                                Converted on {fmtDate(quotation.convertedAt)}. The original quotation is safely archived in the system.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/invoices/${quotation.convertedToInvoiceId._id || quotation.convertedToInvoiceId}`)}
                    >
                        View Generated Invoice <ArrowRight size={14} className="ml-1" />
                    </Button>
                </div>
            )}

            {/* Status Transition Control Strip (Hidden in Print) */}
            {!isConverted && canEdit && (
                <div className="no-print p-4 bg-white border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick Status Update:</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {quotation.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('sent')}>
                                <Send size={14} className="mr-1 text-blue-600" /> Mark as Sent
                            </Button>
                        )}

                        {['draft', 'sent'].includes(quotation.status) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => handleStatusUpdate('accepted')}
                            >
                                <CheckCircle size={14} className="mr-1" /> Mark Accepted
                            </Button>
                        )}

                        {['draft', 'sent'].includes(quotation.status) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                onClick={() => setStatusAction('rejected')}
                            >
                                <XCircle size={14} className="mr-1" /> Mark Rejected
                            </Button>
                        )}

                        {['draft', 'sent'].includes(quotation.status) && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                onClick={() => handleStatusUpdate('expired')}
                            >
                                <Clock size={14} className="mr-1" /> Mark Expired
                            </Button>
                        )}

                        {['rejected', 'expired'].includes(quotation.status) && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('draft')}>
                                Reopen as Draft
                            </Button>
                        )}

                        {quotation.status === 'draft' && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 ml-2"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 size={14} className="mr-1" /> Delete
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Details Screen (Hidden in Print) */}
            <div className="no-print space-y-6">
                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Info */}
                    <Card className="p-5 space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">
                            Customer Information
                        </h3>
                        <div>
                            <p className="font-semibold text-gray-900 text-base">{customer.name || '—'}</p>
                            {customer.code && <p className="text-xs text-gray-500 font-mono">Code: {customer.code}</p>}
                        </div>
                        {customer.contactName && (
                            <p className="text-xs text-gray-700"><span className="font-medium">Contact:</span> {customer.contactName}</p>
                        )}
                        {customer.phone && (
                            <p className="text-xs text-gray-700"><span className="font-medium">Phone:</span> {customer.phone}</p>
                        )}
                        {customer.email && (
                            <p className="text-xs text-gray-700"><span className="font-medium">Email:</span> {customer.email}</p>
                        )}
                        {customer.taxRegistrationNumber && (
                            <p className="text-xs text-gray-700"><span className="font-medium">VAT/Tax No:</span> {customer.taxRegistrationNumber}</p>
                        )}
                    </Card>

                    {/* Quotation & Validity Dates */}
                    <Card className="p-5 space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">
                            Quotation Validity & Terms
                        </h3>
                        <div className="space-y-1.5 text-xs text-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Quotation Date:</span>
                                <span className="font-semibold">{fmtDate(quotation.quotationDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Valid Until:</span>
                                <span className={`font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                    {fmtDate(quotation.validUntil)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Division:</span>
                                <span className="font-medium">{quotation.division === 'print_shop' ? 'Ink Printing Hub' : 'Pothmela Book Shop'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Currency:</span>
                                <span className="font-medium">{quotation.currency || 'LKR'}</span>
                            </div>
                            {quotation.salesRepId && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Sales Representative:</span>
                                    <span className="font-medium">
                                        {quotation.salesRepId.firstName} {quotation.salesRepId.lastName}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Customer Address */}
                    <Card className="p-5 space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b pb-2">
                            Billing / Delivery Address
                        </h3>
                        {billing.line1 || billing.city ? (
                            <div className="text-xs text-gray-700 leading-relaxed">
                                {billing.line1 && <p>{billing.line1}</p>}
                                {billing.line2 && <p>{billing.line2}</p>}
                                <p>{[billing.city, billing.state, billing.postalCode].filter(Boolean).join(', ')}</p>
                                {billing.country && <p>{billing.country}</p>}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No address specified</p>
                        )}
                    </Card>
                </div>

                {/* Line Items Table */}
                <Card className="overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900">Quoted Line Items</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-500 uppercase">
                                    <th className="py-3 px-4 w-12 text-center">#</th>
                                    <th className="py-3 px-4">Item & Description</th>
                                    <th className="py-3 px-4 text-right">Quantity</th>
                                    <th className="py-3 px-4 text-right">Unit Price</th>
                                    <th className="py-3 px-4 text-right">Discount</th>
                                    <th className="py-3 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {items.map((item, idx) => (
                                    <tr key={item._id || idx} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 text-center text-gray-400 font-mono">{idx + 1}</td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-gray-900">{item.productName}</p>
                                            {item.productCode && (
                                                <span className="text-[11px] text-gray-500 font-mono mr-2">SKU: {item.productCode}</span>
                                            )}
                                            {item.description && (
                                                <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium">
                                            {item.quantity} {item.unitOfMeasure || ''}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono">{fmt(item.unitPrice)}</td>
                                        <td className="py-3 px-4 text-right font-mono text-gray-600">
                                            {item.lineDiscount > 0 ? `-${fmt(item.lineDiscount)}` : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                            {fmt(item.lineTotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Section */}
                    <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <div className="w-80 space-y-2 text-xs">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-mono font-medium">{fmt(quotation.subtotal)}</span>
                            </div>

                            {(quotation.totalDiscount > 0 || quotation.orderDiscount?.amount > 0) && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>
                                        Total Discount
                                        {quotation.orderDiscount?.type === 'percentage' && ` (${quotation.orderDiscount.value}%)`}
                                        :
                                    </span>
                                    <span className="font-mono font-medium">
                                        -{fmt((quotation.totalDiscount || 0) + (quotation.orderDiscount?.amount || 0))}
                                    </span>
                                </div>
                            )}

                            {quotation.totalTax > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax / VAT:</span>
                                    <span className="font-mono font-medium">+{fmt(quotation.totalTax)}</span>
                                </div>
                            )}

                            {quotation.shippingCost > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping / Delivery:</span>
                                    <span className="font-mono font-medium">+{fmt(quotation.shippingCost)}</span>
                                </div>
                            )}

                            {quotation.otherCharges > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Other Charges:</span>
                                    <span className="font-mono font-medium">+{fmt(quotation.otherCharges)}</span>
                                </div>
                            )}

                            <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-sm font-bold text-gray-950">
                                <span>Total Quoted Amount:</span>
                                <span className="font-mono text-base text-primary-700">{fmt(quotation.grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Notes & Terms Card */}
                {(quotation.notes || quotation.termsAndConditions) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {quotation.notes && (
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
                                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{quotation.notes}</p>
                            </Card>
                        )}
                        {quotation.termsAndConditions && (
                            <Card className="p-5">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Terms & Conditions</h4>
                                <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{quotation.termsAndConditions}</p>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Dedicated Printable Quotation View (Rendered only during print) */}
            <div className="hidden print:block">
                <PrintableQuotation ref={printRef} quotation={quotation} />
            </div>

            {/* Convert to Invoice Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isConvertDialogOpen}
                title="Convert Quotation to Invoice?"
                message={
                    <div className="space-y-3 text-sm text-gray-600">
                        <p>
                            Are you sure you want to convert quotation <strong>{quotation.quotationNumber}</strong> into a sales invoice?
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li>A brand new invoice with a unique invoice number will be generated.</li>
                            <li>The original quotation will be preserved in your quotation history with status "CONVERTED".</li>
                            <li>Customer balance and financial accounts will be appropriately updated for the new invoice.</li>
                        </ul>
                    </div>
                }
                confirmLabel="Yes, Generate Invoice"
                confirmVariant="primary"
                loading={convertToInvoice.isPending}
                onConfirm={handleConfirmConvert}
                onCancel={() => setIsConvertDialogOpen(false)}
            />

            {/* Rejection Modal */}
            {statusAction === 'rejected' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="max-w-md w-full p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">Mark Quotation as Rejected</h3>
                        <p className="text-xs text-gray-500">Provide an optional reason or customer feedback for rejection:</p>
                        <textarea
                            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500"
                            rows={3}
                            placeholder="e.g. Budget constraints, opted for alternative vendor, job postponed..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setStatusAction(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleStatusUpdate('rejected', rejectReason)}
                            >
                                Confirm Rejection
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                title="Delete Quotation?"
                message={`Are you sure you want to delete quotation ${quotation.quotationNumber}? This action cannot be undone.`}
                confirmLabel="Delete Quotation"
                confirmVariant="danger"
                loading={deleteMutation.isPending}
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
            />
        </div>
    );
}

