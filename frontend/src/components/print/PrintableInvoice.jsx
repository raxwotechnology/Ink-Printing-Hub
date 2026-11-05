import { forwardRef } from 'react';
import { useCompanySettings } from '../../features/settings/useSettings';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
}) : '—';

/**
 * Printable A4 Invoice & Quotation Component
 * 
 * @param {Object} invoice - Invoice or Sales Order object
 * @param {Array} payments - Array of payments allocated to this invoice
 * @param {Object} companyInfo - Optional company branding override
 * @param {string} documentType - 'invoice' | 'quotation'
 */
const PrintableInvoice = forwardRef(({ 
    invoice, 
    payments = [], 
    companyInfo: propCompanyInfo,
    documentType = 'invoice',
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

    const isQuotation = documentType === 'quotation' || 
                        invoice.invoiceType === 'quotation' || 
                        invoice.invoiceType === 'proforma' ||
                        invoice.isQuotation === true;

    const customer = invoice.customerSnapshot || {};
    const billingAddr = invoice.billingAddress || {};
    const shippingAddr = invoice.shippingAddress || billingAddr;

    const totalPaid = payments.reduce((sum, p) => {
        const alloc = p.allocations?.find((a) =>
            (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id?.toString()
        );
        return sum + (alloc?.amount || 0);
    }, 0);

    const balanceDue = (invoice.grandTotal || 0) - totalPaid;

    // Document reference numbers
    const rawNumber = invoice.invoiceNumber || invoice.orderNumber || '000001';
    const quotationNumber = invoice.quotationNumber || `QTN-${rawNumber.replace(/^(INV-|POS-|SO-)/, '')}`;
    const invoiceNumber = invoice.invoiceNumber || `INV-${rawNumber.replace(/^(SO-|QTN-)/, '')}`;

    // Valid until date for quotation (default: 14 days from date)
    const issueDate = invoice.invoiceDate || invoice.orderDate || invoice.createdAt || new Date();
    const validUntilDate = invoice.validUntil || invoice.dueDate || new Date(new Date(issueDate).getTime() + 14 * 24 * 60 * 60 * 1000);

    return (
        <div ref={ref} className="print-container bg-white text-black p-8 max-w-[820px] mx-auto text-sm leading-relaxed">
            <style type="text/css" media="print">
                {`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-container { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            {/* Header */}
            <div className="flex justify-between items-start pb-5 mb-6 border-b-2 border-gray-800">
                <div className="max-w-[60%]">
                    {companyInfo.logo && (
                        <img src={companyInfo.logo} alt="Logo" className="h-16 mb-2 object-contain" />
                    )}
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">{companyInfo.name}</h1>
                    <p className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-1.5">{companyInfo.tagline}</p>
                    {companyInfo.address && <p className="text-xs text-gray-600">{companyInfo.address}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">
                        {companyInfo.phone && <span className="font-medium">Tel: {companyInfo.phone}</span>}
                        {companyInfo.email && <span> · Email: {companyInfo.email}</span>}
                        {companyInfo.website && <span> · {companyInfo.website}</span>}
                    </p>
                    {companyInfo.taxNumber && (
                        <p className="text-xs text-gray-700 font-medium mt-1">VAT / Tax Reg No: {companyInfo.taxNumber}</p>
                    )}
                </div>

                <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2 ${
                        isQuotation ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-900 text-white'
                    }`}>
                        {isQuotation ? 'PRICE QUOTATION' : 'TAX INVOICE'}
                    </div>
                    <h2 className="text-xl font-mono font-bold text-gray-800">
                        {isQuotation ? quotationNumber : invoiceNumber}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Date: <span className="font-medium text-gray-800">{formatDate(issueDate)}</span>
                    </p>
                    {isQuotation ? (
                        <p className="text-xs text-amber-800 font-semibold mt-0.5">
                            Valid Until: {formatDate(validUntilDate)}
                        </p>
                    ) : (
                        <p className="text-xs text-gray-600 mt-0.5">
                            Due Date: <span className="font-semibold">{formatDate(invoice.dueDate)}</span>
                        </p>
                    )}
                    {invoice.salesOrderNumbers?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                            Order Ref: {invoice.salesOrderNumbers.join(', ')}
                        </p>
                    )}
                    {invoice.salesOrderId?.orderNumber && (
                        <p className="text-xs text-gray-500 mt-0.5">
                            Order Ref: {invoice.salesOrderId.orderNumber}
                        </p>
                    )}
                </div>
            </div>

            {/* Bill To / Quotation To */}
            <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <p className="text-xs uppercase font-bold tracking-wider text-gray-500 mb-1">
                        {isQuotation ? 'QUOTATION ISSUED TO' : 'BILL TO'}
                    </p>
                    <p className="font-bold text-gray-900 text-base">{customer.name || 'Valued Customer'}</p>
                    {customer.code && <p className="text-xs font-mono text-gray-500">Code: {customer.code}</p>}
                    {customer.phone && <p className="text-xs text-gray-700 font-medium mt-1">Phone: {customer.phone}</p>}
                    {customer.email && <p className="text-xs text-gray-600">Email: {customer.email}</p>}
                    {billingAddr.line1 && <p className="text-xs text-gray-600 mt-1">{billingAddr.line1}</p>}
                    {billingAddr.line2 && <p className="text-xs text-gray-600">{billingAddr.line2}</p>}
                    {(billingAddr.city || billingAddr.state) && (
                        <p className="text-xs text-gray-600">{billingAddr.city}{billingAddr.state ? `, ${billingAddr.state}` : ''}</p>
                    )}
                    {customer.taxRegistrationNumber && (
                        <p className="text-xs text-gray-800 font-medium mt-1">Tax No: {customer.taxRegistrationNumber}</p>
                    )}
                </div>

                <div className="flex flex-col justify-between text-xs">
                    <div>
                        <p className="uppercase font-bold tracking-wider text-gray-500 mb-1">DOCUMENT DETAILS</p>
                        <table className="w-full text-xs">
                            <tbody>
                                <tr>
                                    <td className="text-gray-500 py-0.5">Division:</td>
                                    <td className="text-right font-semibold text-gray-800">
                                        {divKey === 'print_shop' ? 'Ink Printing Hub' : 'Pothmela Book Shop'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="text-gray-500 py-0.5">Payment Terms:</td>
                                    <td className="text-right font-medium">
                                        {invoice.paymentTerms?.type === 'credit'
                                            ? `${invoice.paymentTerms.creditDays} Days Credit`
                                            : (invoice.paymentTerms?.type || 'Cash / Immediate').toUpperCase()}
                                    </td>
                                </tr>
                                {invoice.deliveryMethod && (
                                    <tr>
                                        <td className="text-gray-500 py-0.5">Delivery:</td>
                                        <td className="text-right font-medium capitalize">{invoice.deliveryMethod}</td>
                                    </tr>
                                )}
                                {!isQuotation && (
                                    <tr>
                                        <td className="text-gray-500 py-0.5">Payment Status:</td>
                                        <td className="text-right font-bold uppercase text-xs">
                                            {invoice.paymentStatus || 'UNPAID'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {isQuotation && (
                        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900 mt-2">
                            ⭐ <strong>Quotation Note:</strong> This is an estimate based on current specifications. Subject to acceptance within 14 days.
                        </div>
                    )}
                </div>
            </div>

            {/* Line items table */}
            <table className="w-full mb-6 border-collapse">
                <thead>
                    <tr className="bg-gray-800 text-white text-xs">
                        <th className="text-left p-2.5 font-semibold w-8">#</th>
                        <th className="text-left p-2.5 font-semibold">Item & Description</th>
                        <th className="text-right p-2.5 font-semibold w-16">Qty</th>
                        <th className="text-right p-2.5 font-semibold w-24">Unit Price (LKR)</th>
                        <th className="text-right p-2.5 font-semibold w-16">Disc%</th>
                        <th className="text-right p-2.5 font-semibold w-16">Tax%</th>
                        <th className="text-right p-2.5 font-semibold w-28">Total (LKR)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 border-b border-gray-300">
                    {(invoice.items || []).map((item, idx) => {
                        const lineSub = (item.quantity || 0) * (item.unitPrice || 0);
                        const lineDisc = lineSub * ((item.discountPercent || 0) / 100);
                        const taxableBase = item.taxable !== false ? (lineSub - lineDisc) : 0;
                        const lineTax = taxableBase * ((item.taxRate || 0) / 100);
                        const lineTotal = item.lineTotal || (lineSub - lineDisc + lineTax);

                        return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                <td className="p-2.5 text-xs text-gray-500 font-mono">{idx + 1}</td>
                                <td className="p-2.5">
                                    <div className="font-semibold text-gray-900">{item.productName || item.description}</div>
                                    {item.productCode && <div className="text-xs text-gray-500 font-mono">Code: {item.productCode}</div>}
                                    {item.description && item.description !== item.productName && (
                                        <div className="text-xs text-gray-600 mt-0.5">{item.description}</div>
                                    )}
                                </td>
                                <td className="p-2.5 text-right font-medium">
                                    {item.quantity} {item.unitOfMeasure || ''}
                                </td>
                                <td className="p-2.5 text-right font-mono text-gray-800">{fmt(item.unitPrice)}</td>
                                <td className="p-2.5 text-right text-gray-600">{item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
                                <td className="p-2.5 text-right text-gray-600">{item.taxRate > 0 ? `${item.taxRate}%` : '—'}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-gray-900">{fmt(lineTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals & Notes Section */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    {/* Notes or Quotation Terms */}
                    {isQuotation ? (
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs text-gray-700 space-y-1.5">
                            <p className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Quotation Terms & Conditions:</p>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600">
                                <li>Quotation is valid for <strong>14 days</strong> from the date of issue.</li>
                                <li>Production starts after formal approval and agreed advance payment.</li>
                                <li>Artwork proofs must be signed off prior to final print run.</li>
                                <li>Lead time: 3–5 working days from proof sign-off.</li>
                            </ol>
                        </div>
                    ) : (
                        invoice.notes && (
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs text-gray-700">
                                <p className="font-bold text-gray-800 uppercase tracking-wider text-[11px] mb-1">Invoice Notes:</p>
                                <p className="whitespace-pre-wrap">{invoice.notes}</p>
                            </div>
                        )
                    )}

                    {/* Bank / Remittance info */}
                    {!isQuotation && (
                        <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-gray-700">
                            <p className="font-bold text-blue-900 uppercase tracking-wider text-[11px] mb-1">Payment Instructions:</p>
                            <p className="text-gray-600">Please make cheque or bank transfers payable to <strong>{companyInfo.name}</strong>.</p>
                            <p className="text-gray-600 mt-0.5">Please quote the invoice number <strong>{invoiceNumber}</strong> as the payment reference.</p>
                        </div>
                    )}
                </div>

                {/* Calculation Summary */}
                <div className="flex justify-end">
                    <table className="text-xs w-full max-w-[320px]">
                        <tbody>
                            <tr>
                                <td className="text-gray-600 py-1.5 font-medium">Subtotal:</td>
                                <td className="text-right py-1.5 font-mono text-gray-900">{fmt(invoice.subtotal)}</td>
                            </tr>
                            {(invoice.totalDiscount > 0 || invoice.orderDiscount?.amount > 0) && (
                                <tr>
                                    <td className="text-gray-600 py-1.5 font-medium">Discount:</td>
                                    <td className="text-right py-1.5 font-mono text-red-600">
                                        -{fmt((invoice.totalDiscount || 0) + (invoice.orderDiscount?.amount || 0))}
                                    </td>
                                </tr>
                            )}
                            {invoice.totalTax > 0 && (
                                <tr>
                                    <td className="text-gray-600 py-1.5 font-medium">Tax / VAT:</td>
                                    <td className="text-right py-1.5 font-mono text-gray-900">{fmt(invoice.totalTax)}</td>
                                </tr>
                            )}
                            {invoice.shippingCost > 0 && (
                                <tr>
                                    <td className="text-gray-600 py-1.5 font-medium">Delivery / Shipping:</td>
                                    <td className="text-right py-1.5 font-mono text-gray-900">{fmt(invoice.shippingCost)}</td>
                                </tr>
                            )}
                            <tr className="border-t-2 border-b-2 border-gray-900 bg-gray-50">
                                <td className="font-black py-2.5 text-sm uppercase text-gray-900">
                                    {isQuotation ? 'Estimated Grand Total:' : 'Grand Total:'}
                                </td>
                                <td className="text-right font-black py-2.5 text-base font-mono text-gray-900">
                                    {fmt(invoice.grandTotal)}
                                </td>
                            </tr>

                            {/* Only show paid and balance due on invoices */}
                            {!isQuotation && totalPaid > 0 && (
                                <>
                                    <tr>
                                        <td className="text-gray-600 py-1.5 font-medium">Amount Paid:</td>
                                        <td className="text-right py-1.5 font-mono text-green-700 font-bold">
                                            {fmt(totalPaid)}
                                        </td>
                                    </tr>
                                    <tr className="border-t border-gray-300">
                                        <td className="font-bold py-2 text-sm text-gray-900">Balance Due:</td>
                                        <td className={`text-right font-bold py-2 font-mono text-sm ${balanceDue > 0 ? 'text-red-600' : 'text-green-700'}`}>
                                            {fmt(balanceDue)}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payments history (Only on invoices) */}
            {!isQuotation && payments.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs uppercase font-bold tracking-wider text-gray-500 mb-1.5">Payment History</p>
                    <table className="w-full text-xs border border-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left p-2 border-b">Date</th>
                                <th className="text-left p-2 border-b">Receipt / Ref</th>
                                <th className="text-left p-2 border-b">Method</th>
                                <th className="text-right p-2 border-b">Amount Paid (LKR)</th>
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

            {/* Signature Blocks */}
            <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-2 gap-10">
                {isQuotation ? (
                    <>
                        <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-8">Customer Acceptance (Sign & Stamp)</p>
                            <div className="border-t border-gray-400 w-48 mx-auto mb-1"></div>
                            <p className="text-[11px] text-gray-500">I / We accept the above quotation & terms</p>
                            <p className="text-[11px] text-gray-500 mt-1">Date: ________________________</p>
                        </div>
                        <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                            <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-8">Prepared By / Authorized Signature</p>
                            <div className="border-t border-gray-400 w-48 mx-auto mb-1"></div>
                            <p className="text-[11px] text-gray-700 font-semibold">{companyInfo.name}</p>
                            <p className="text-[11px] text-gray-500 mt-1">Date: ________________________</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-center pt-8">
                            <div className="border-t border-gray-400 w-48 mx-auto mb-1"></div>
                            <p className="text-xs font-bold text-gray-700">Customer Confirmation</p>
                            <p className="text-[11px] text-gray-500">Received goods / services in good order</p>
                        </div>
                        <div className="text-center pt-8">
                            <div className="border-t border-gray-400 w-48 mx-auto mb-1"></div>
                            <p className="text-xs font-bold text-gray-800">{companyInfo.name}</p>
                            <p className="text-[11px] text-gray-500">Authorized Officer Signature & Seal</p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer message */}
            <div className="text-center text-xs text-gray-400 pt-6 mt-4">
                {isQuotation 
                    ? `Thank you for requesting a quotation from ${companyInfo.name}. We look forward to serving you.`
                    : `Thank you for your business with ${companyInfo.name}!`}
            </div>
        </div>
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;
