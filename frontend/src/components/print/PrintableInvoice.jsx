import { forwardRef } from 'react';
import { useCompanySettings } from '../../features/settings/useSettings';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
}) : '—';

/**
 * Dedicated Printable A4 Invoice Component
 *
 * Professional business invoice layout formatted for A4 portrait paper.
 * Hides all navigation elements during printing.
 * Uses title "TAX INVOICE" only if tax registration exists and taxes are charged,
 * otherwise titles clearly as "INVOICE".
 */
const PrintableInvoice = forwardRef(({
    invoice,
    payments = [],
    companyInfo: propCompanyInfo,
}, ref) => {
    const { data: settingsRes } = useCompanySettings();

    if (!invoice) return null;

    const s = settingsRes?.data || {};
    const divKey = invoice.division || 'print_shop';
    const divSettings = s.divisions?.[divKey] || {};
    const divSnap = invoice.divisionSnapshot || {};

    const defaultName = divKey === 'print_shop' ? 'Ink Printing Hub (pvt) Ltd' : 'Pothmela Book Shop';
    const defaultTagline = divKey === 'print_shop'
        ? 'COMMERCIAL PRINTING, PACKAGING & BRANDING SOLUTIONS'
        : 'YOUR TRUSTED BOOKSTORE & STATIONERY HUB';
    const defaultAddress = divKey === 'print_shop'
        ? 'No. 123, High Level Road, Colombo, Sri Lanka'
        : 'Main Street, Book Fair Center, Colombo, Sri Lanka';
    const defaultPhone = '+94 11 234 5678 / +94 77 123 4567';
    const defaultEmail = divKey === 'print_shop' ? 'info@inkprintinghub.lk' : 'info@pothmela.lk';

    const companyInfo = {
        name: (propCompanyInfo?.name && propCompanyInfo.name !== 'Your Company Name')
            ? propCompanyInfo.name
            : (divSnap.name || divSettings.name || (divKey === 'print_shop' ? defaultName : (s.companyName || defaultName))),
        tagline: divSnap.tagline || divSettings.tagline || defaultTagline,
        address: divSnap.address || divSettings.address || s.address || defaultAddress,
        phone: divSnap.phone || divSettings.phone || s.phone || defaultPhone,
        taxNumber: divSnap.taxRegistrationNumber || divSettings.taxRegistrationNumber || s.taxRegistrationNumber,
        email: divSnap.email || divSettings.email || s.email || defaultEmail,
        website: divSnap.website || divSettings.website || s.website,
        logo: divSnap.logoUrl || divSettings.logoUrl || s.logoUrl || propCompanyInfo?.logo || ''
    };

    // Determine title: Use TAX INVOICE only when configured with tax reg & taxes apply
    const isTaxInvoice = Boolean(companyInfo.taxNumber) && (invoice.totalTax > 0);
    const documentTitle = isTaxInvoice ? 'TAX INVOICE' : 'INVOICE';

    const customer = invoice.customerSnapshot || {};
    const billingAddr = invoice.billingAddress || {};

    const totalPaid = payments.reduce((sum, p) => {
        const alloc = p.allocations?.find((a) =>
            (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id?.toString()
        );
        return sum + (alloc?.amount || 0);
    }, 0);

    const balanceDue = Math.max(0, (invoice.grandTotal || 0) - totalPaid);
    const invoiceNumber = invoice.invoiceNumber || 'INV-000001';
    const issueDate = invoice.invoiceDate || invoice.createdAt || new Date();

    return (
        <div ref={ref} className="print-container bg-white text-black p-8 max-w-[820px] mx-auto text-sm leading-relaxed font-sans">
            <style type="text/css" media="print">
                {`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-container { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    .no-print { display: none !important; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                    .keep-together { break-inside: avoid; page-break-inside: avoid; }
                }
                `}
            </style>

            {/* Document Header */}
            <div className="flex justify-between items-start pb-5 mb-6 border-b-2 border-gray-900">
                <div className="max-w-[60%]">
                    {companyInfo.logo && (
                        <img src={companyInfo.logo} alt="Logo" className="h-14 mb-2 object-contain" />
                    )}
                    <h1 className="text-xl font-bold uppercase tracking-wide text-gray-950">{companyInfo.name}</h1>
                    {companyInfo.tagline && (
                        <p className="text-xs text-gray-600 font-medium mb-1 tracking-wider uppercase">{companyInfo.tagline}</p>
                    )}
                    {companyInfo.address && <p className="text-xs text-gray-600 whitespace-pre-line">{companyInfo.address}</p>}
                    <div className="text-xs text-gray-600 mt-1 space-x-3">
                        {companyInfo.phone && <span>Tel: {companyInfo.phone}</span>}
                        {companyInfo.email && <span>Email: {companyInfo.email}</span>}
                        {companyInfo.website && <span>{companyInfo.website}</span>}
                    </div>
                    {companyInfo.taxNumber && (
                        <p className="text-xs text-gray-700 font-semibold mt-1">VAT/Tax Reg No: {companyInfo.taxNumber}</p>
                    )}
                </div>

                <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-gray-900 text-white font-extrabold text-sm tracking-widest uppercase rounded">
                        {documentTitle}
                    </span>
                    <div className="mt-3 text-xs space-y-1">
                        <div>
                            <span className="text-gray-500 font-medium">Invoice No: </span>
                            <span className="font-mono font-bold text-gray-950 text-sm">{invoiceNumber}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-medium">Invoice Date: </span>
                            <span className="font-semibold text-gray-900">{formatDate(issueDate)}</span>
                        </div>
                        {invoice.dueDate && (
                            <div>
                                <span className="text-gray-500 font-medium">Due Date: </span>
                                <span className="font-semibold text-gray-900">{formatDate(invoice.dueDate)}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500 font-medium">Payment Status: </span>
                            <span className={`uppercase font-bold text-xs ${
                                invoice.paymentStatus === 'paid' ? 'text-green-700' :
                                invoice.paymentStatus === 'partially_paid' ? 'text-blue-700' :
                                invoice.paymentStatus === 'overdue' ? 'text-red-700' : 'text-gray-700'
                            }`}>
                                {invoice.paymentStatus?.replace(/_/g, ' ') || 'UNPAID'}
                            </span>
                        </div>
                        {invoice.salesOrderNumbers?.length > 0 && (
                            <div>
                                <span className="text-gray-500 font-medium">Order Ref: </span>
                                <span className="font-mono text-gray-800">{invoice.salesOrderNumbers.join(', ')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer Information Box */}
            <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">BILL TO:</h3>
                    <p className="font-bold text-gray-950 text-base">{customer.name || 'Valued Customer'}</p>
                    {customer.code && <p className="text-xs text-gray-600 font-mono">Customer Code: {customer.code}</p>}
                    {customer.contactName && <p className="text-xs text-gray-700">Attn: {customer.contactName}</p>}
                    {customer.phone && <p className="text-xs text-gray-700">Tel: {customer.phone}</p>}
                    {customer.email && <p className="text-xs text-gray-700">Email: {customer.email}</p>}
                    {customer.taxRegistrationNumber && (
                        <p className="text-xs text-gray-700 font-medium mt-1">Tax Reg No: {customer.taxRegistrationNumber}</p>
                    )}
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">BILLING / DELIVERY DETAILS:</h3>
                    {billingAddr.line1 || billingAddr.city ? (
                        <div className="text-xs text-gray-700 leading-relaxed mb-2">
                            {billingAddr.line1 && <p>{billingAddr.line1}</p>}
                            {billingAddr.line2 && <p>{billingAddr.line2}</p>}
                            <p>
                                {[billingAddr.city, billingAddr.state, billingAddr.postalCode].filter(Boolean).join(', ')}
                            </p>
                            {billingAddr.country && <p>{billingAddr.country}</p>}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic mb-2">Address not specified</p>
                    )}
                    <div className="text-xs text-gray-600 space-y-0.5">
                        <p>
                            <span className="font-medium text-gray-500">Payment Terms: </span>
                            {invoice.paymentTerms?.type === 'credit'
                                ? `${invoice.paymentTerms.creditDays} Days Credit`
                                : (invoice.paymentTerms?.type || 'Cash / Immediate').toUpperCase()}
                        </p>
                        <p>
                            <span className="font-medium text-gray-500">Division: </span>
                            {divKey === 'print_shop' ? 'Ink Printing Hub' : 'Pothmela Book Shop'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border-collapse mb-6">
                <thead>
                    <tr className="border-b-2 border-gray-900 bg-gray-100 text-xs text-gray-800 uppercase font-semibold">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-right w-20">Qty</th>
                        <th className="py-2.5 px-3 text-right w-28">Unit Price</th>
                        <th className="py-2.5 px-3 text-right w-24">Disc</th>
                        {isTaxInvoice && <th className="py-2.5 px-3 text-right w-20">Tax</th>}
                        <th className="py-2.5 px-3 text-right w-28">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                    {(invoice.items || []).map((item, idx) => (
                        <tr key={item._id || idx} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                                <p className="font-semibold text-gray-950">{item.productName || item.description}</p>
                                {item.productCode && (
                                    <span className="text-[11px] text-gray-500 font-mono mr-2">SKU: {item.productCode}</span>
                                )}
                                {item.description && item.description !== item.productName && (
                                    <p className="text-[11px] text-gray-600 mt-0.5">{item.description}</p>
                                )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">
                                {item.quantity} {item.unitOfMeasure || ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                                {fmt(item.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-600 font-mono">
                                {item.discountPercent > 0 ? `${item.discountPercent}%` : item.discountAmount > 0 ? fmt(item.discountAmount) : '—'}
                            </td>
                            {isTaxInvoice && (
                                <td className="py-2.5 px-3 text-right text-gray-600 font-mono">
                                    {item.taxRate > 0 ? `${item.taxRate}%` : '—'}
                                </td>
                            )}
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-950">
                                {fmt(item.lineTotal)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals & Notes Section */}
            <div className="keep-together">
                <div className="flex justify-end mb-6">
                    <div className="w-72 space-y-2 text-xs border border-gray-200 p-4 bg-gray-50 rounded">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal:</span>
                            <span className="font-mono font-medium">{fmt(invoice.subtotal)}</span>
                        </div>

                        {(invoice.totalDiscount > 0 || invoice.orderDiscount?.amount > 0) && (
                            <div className="flex justify-between text-emerald-700">
                                <span>
                                    Discount
                                    {invoice.orderDiscount?.type === 'percentage' && ` (${invoice.orderDiscount.value}%)`}
                                    :
                                </span>
                                <span className="font-mono font-medium">
                                    -{fmt((invoice.totalDiscount || 0) + (invoice.orderDiscount?.amount || 0))}
                                </span>
                            </div>
                        )}

                        {invoice.totalTax > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Tax / VAT:</span>
                                <span className="font-mono font-medium">+{fmt(invoice.totalTax)}</span>
                            </div>
                        )}

                        {invoice.shippingCost > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping / Delivery:</span>
                                <span className="font-mono font-medium">+{fmt(invoice.shippingCost)}</span>
                            </div>
                        )}

                        {invoice.otherCharges > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Other Charges:</span>
                                <span className="font-mono font-medium">+{fmt(invoice.otherCharges)}</span>
                            </div>
                        )}

                        <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-sm font-bold text-gray-950">
                            <span>GRAND TOTAL:</span>
                            <span className="font-mono text-base">{invoice.currency || 'LKR'} {fmt(invoice.grandTotal)}</span>
                        </div>

                        {totalPaid > 0 && (
                            <>
                                <div className="flex justify-between text-green-700 pt-1">
                                    <span>Amount Paid:</span>
                                    <span className="font-mono font-bold">-{fmt(totalPaid)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-xs">
                                    <span>Balance Due:</span>
                                    <span className={`font-mono ${balanceDue > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                        {fmt(balanceDue)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Payment History if payments recorded */}
                {payments.length > 0 && (
                    <div className="mb-6 text-xs">
                        <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px] mb-1.5">Recorded Payments</p>
                        <table className="w-full border border-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="text-left p-2 border-b">Payment Date</th>
                                    <th className="text-left p-2 border-b">Receipt #</th>
                                    <th className="text-left p-2 border-b">Method</th>
                                    <th className="text-right p-2 border-b">Amount Allocated (LKR)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => {
                                    const alloc = p.allocations?.find((a) =>
                                        (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id?.toString()
                                    );
                                    return (
                                        <tr key={p._id} className="border-b last:border-b-0">
                                            <td className="p-2">{formatDate(p.paymentDate)}</td>
                                            <td className="p-2 font-mono">{p.paymentNumber}</td>
                                            <td className="p-2 capitalize">{p.method?.replace(/_/g, ' ')}</td>
                                            <td className="p-2 text-right font-mono font-bold text-green-700">{fmt(alloc?.amount || 0)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Notes & Instructions */}
                {(invoice.notes || invoice.paymentInstructions || invoice.termsAndConditions) && (
                    <div className="grid grid-cols-2 gap-6 mb-6 text-xs border-t border-gray-200 pt-4">
                        <div>
                            {invoice.notes && (
                                <div className="mb-3">
                                    <h4 className="font-bold text-gray-800 uppercase tracking-wide mb-1">Invoice Notes</h4>
                                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                                </div>
                            )}
                            {invoice.paymentInstructions && (
                                <div>
                                    <h4 className="font-bold text-gray-800 uppercase tracking-wide mb-1">Payment Instructions</h4>
                                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{invoice.paymentInstructions}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            {invoice.termsAndConditions && (
                                <div>
                                    <h4 className="font-bold text-gray-800 uppercase tracking-wide mb-1">Terms & Conditions</h4>
                                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">{invoice.termsAndConditions}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Signature Blocks */}
                <div className="mt-10 pt-6 border-t border-gray-300">
                    <div className="grid grid-cols-2 gap-12 text-center text-xs">
                        <div>
                            <div className="h-16 flex items-end justify-center">
                                <div className="w-48 border-b border-gray-400"></div>
                            </div>
                            <p className="font-bold text-gray-900 mt-2">Customer Confirmation</p>
                            <p className="text-gray-500 text-[11px]">Received goods / services in good order</p>
                        </div>

                        <div>
                            <div className="h-16 flex items-end justify-center">
                                <div className="w-48 border-b border-gray-400"></div>
                            </div>
                            <p className="font-bold text-gray-900 mt-2">Authorized Officer Signature</p>
                            <p className="text-gray-500 text-[11px]">{companyInfo.name}</p>
                        </div>
                    </div>
                </div>

                {/* Document Footer */}
                <div className="mt-8 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3">
                    <p>Thank you for your business! Invoice Ref: {invoiceNumber}</p>
                </div>
            </div>
        </div>
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';

export default PrintableInvoice;
