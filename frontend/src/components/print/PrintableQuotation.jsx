import { forwardRef } from 'react';
import { useCompanySettings } from '../../features/settings/useSettings';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
}) : '—';

/**
 * Printable A4 Price Quotation Component
 * 
 * Strictly titled PRICE QUOTATION.
 * Formatted for A4 paper with professional branding, itemized table,
 * validity declaration, terms, and acceptance signature section.
 */
const PrintableQuotation = forwardRef(({
    quotation,
    companyInfo: propCompanyInfo,
}, ref) => {
    const { data: settingsRes } = useCompanySettings();

    if (!quotation) return null;

    const s = settingsRes?.data || {};
    const divKey = quotation.division || 'print_shop';
    const divSettings = s.divisions?.[divKey] || {};
    const divSnap = quotation.divisionSnapshot || {};

    const defaultName = divKey === 'print_shop' ? 'Ink Printing Hub (pvt) Ltd' : 'Pothmela Book Shop';
    const defaultTagline = divKey === 'print_shop'
        ? 'COMMERCIAL PRINTING, PACKAGING & BRANDING SOLUTIONS'
        : 'YOUR TRUSTED BOOKSTORE & STATIONERY HUB';
    const defaultAddress = divKey === 'print_shop'
        ? 'No. 123, High Level Road, Colombo, Sri Lanka'
        : 'Main Street, Book Fair Center, Colombo, Sri Lanka';
    const defaultPhone = '+94 11 234 5678 / +94 77 123 4567';
    const defaultEmail = divKey === 'print_shop' ? 'info@inkprintinghub.lk' : 'info@pothmela.lk';

    const company = {
        name: divSnap.name || divSettings.name || (divKey === 'print_shop' ? defaultName : (s.companyName || defaultName)),
        tagline: divSnap.tagline || divSettings.tagline || defaultTagline,
        address: divSnap.address || divSettings.address || s.address || defaultAddress,
        phone: divSnap.phone || divSettings.phone || s.phone || defaultPhone,
        taxNumber: divSnap.taxRegistrationNumber || divSettings.taxRegistrationNumber || s.taxRegistrationNumber,
        email: divSnap.email || divSettings.email || s.email || defaultEmail,
        website: divSnap.website || divSettings.website || s.website,
        logo: divSnap.logoUrl || divSettings.logoUrl || s.logoUrl || '',
    };

    const customer = quotation.customerSnapshot || {};
    const billingAddr = quotation.billingAddress || {};
    const items = quotation.items || [];

    const quotationDate = quotation.quotationDate || quotation.createdAt || new Date();
    const validUntil = quotation.validUntil;

    return (
        <div ref={ref} className="print-container bg-white text-black p-8 max-w-[820px] mx-auto text-sm leading-relaxed font-sans">
            <style type="text/css" media="print">
                {`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print-container { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            {/* Document Header */}
            <div className="flex justify-between items-start pb-5 mb-6 border-b-2 border-gray-900">
                <div className="max-w-[60%]">
                    {company.logo && (
                        <img src={company.logo} alt="Company Logo" className="h-14 mb-2 object-contain" />
                    )}
                    <h1 className="text-xl font-bold uppercase tracking-wide text-gray-950">{company.name}</h1>
                    {company.tagline && <p className="text-xs text-gray-600 font-medium mb-1 tracking-wider uppercase">{company.tagline}</p>}
                    <p className="text-xs text-gray-600 whitespace-pre-line">{company.address}</p>
                    <div className="text-xs text-gray-600 mt-1 space-x-3">
                        {company.phone && <span>Tel: {company.phone}</span>}
                        {company.email && <span>Email: {company.email}</span>}
                    </div>
                    {company.taxNumber && (
                        <p className="text-xs text-gray-700 font-semibold mt-1">VAT/Tax Reg No: {company.taxNumber}</p>
                    )}
                </div>

                <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-gray-900 text-white font-extrabold text-sm tracking-widest uppercase rounded">
                        PRICE QUOTATION
                    </span>
                    <div className="mt-3 text-xs space-y-1">
                        <div>
                            <span className="text-gray-500 font-medium">Quotation No: </span>
                            <span className="font-mono font-bold text-gray-950 text-sm">{quotation.quotationNumber}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-medium">Date: </span>
                            <span className="font-semibold text-gray-900">{formatDate(quotationDate)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 font-medium">Valid Until: </span>
                            <span className="font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                {formatDate(validUntil)}
                            </span>
                        </div>
                        {quotation.currency && (
                            <div>
                                <span className="text-gray-500 font-medium">Currency: </span>
                                <span className="font-semibold text-gray-900">{quotation.currency}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500 font-medium">Status: </span>
                            <span className="uppercase font-bold text-xs text-gray-700">{quotation.status}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer & Quotation Info */}
            <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">QUOTATION ISSUED TO:</h3>
                    <p className="font-bold text-gray-950 text-base">{customer.name || 'Valued Customer'}</p>
                    {customer.code && <p className="text-xs text-gray-600 font-mono">Code: {customer.code}</p>}
                    {customer.contactName && <p className="text-xs text-gray-700">Attn: {customer.contactName}</p>}
                    {customer.phone && <p className="text-xs text-gray-700">Tel: {customer.phone}</p>}
                    {customer.email && <p className="text-xs text-gray-700">Email: {customer.email}</p>}
                    {customer.taxRegistrationNumber && (
                        <p className="text-xs text-gray-700 font-medium mt-1">Tax Reg No: {customer.taxRegistrationNumber}</p>
                    )}
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CUSTOMER ADDRESS:</h3>
                    {billingAddr.line1 || billingAddr.city ? (
                        <div className="text-xs text-gray-700 leading-relaxed">
                            {billingAddr.line1 && <p>{billingAddr.line1}</p>}
                            {billingAddr.line2 && <p>{billingAddr.line2}</p>}
                            <p>
                                {[billingAddr.city, billingAddr.state, billingAddr.postalCode].filter(Boolean).join(', ')}
                            </p>
                            {billingAddr.country && <p>{billingAddr.country}</p>}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">Address not specified</p>
                    )}
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
                        <th className="py-2.5 px-3 text-right w-28">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                    {items.map((item, idx) => (
                        <tr key={item._id || idx} className="hover:bg-gray-50">
                            <td className="py-2.5 px-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                                <p className="font-semibold text-gray-950">{item.productName}</p>
                                {item.productCode && (
                                    <span className="text-[11px] text-gray-500 font-mono mr-2">SKU: {item.productCode}</span>
                                )}
                                {item.description && (
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
                                {item.lineDiscount > 0 ? `${fmt(item.lineDiscount)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-950">
                                {fmt(item.lineTotal)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary & Totals */}
            <div className="flex justify-end mb-8">
                <div className="w-72 space-y-2 text-xs border border-gray-200 p-4 bg-gray-50 rounded">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-mono font-medium">{fmt(quotation.subtotal)}</span>
                    </div>

                    {(quotation.totalDiscount > 0 || quotation.orderDiscount?.amount > 0) && (
                        <div className="flex justify-between text-emerald-700">
                            <span>
                                Discount
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
                        <span>TOTAL QUOTED:</span>
                        <span className="font-mono text-base">{quotation.currency || 'LKR'} {fmt(quotation.grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-6 mb-8 text-xs border-t border-gray-200 pt-4">
                <div>
                    <h4 className="font-bold text-gray-800 uppercase tracking-wide mb-1">Notes & Remarks</h4>
                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                        {quotation.notes || 'Thank you for your inquiry. Please contact us for any clarifications or custom requirements.'}
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 uppercase tracking-wide mb-1">Terms & Conditions</h4>
                    <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                        {quotation.termsAndConditions ||
                            `1. This quotation is valid until ${formatDate(validUntil)}.\n2. Prices are subject to confirmation upon order placement.\n3. Delivery timelines will be confirmed upon formal acceptance.`}
                    </p>
                </div>
            </div>

            {/* Acceptance Signature Block */}
            <div className="mt-12 pt-6 border-t border-gray-300">
                <div className="grid grid-cols-2 gap-12 text-center text-xs">
                    <div>
                        <div className="h-16 flex items-end justify-center">
                            <div className="w-48 border-b border-gray-400"></div>
                        </div>
                        <p className="font-bold text-gray-900 mt-2">Prepared By / Authorized Signature</p>
                        <p className="text-gray-500 text-[11px]">{company.name}</p>
                    </div>

                    <div>
                        <div className="h-16 flex items-end justify-center">
                            <div className="w-48 border-b border-gray-400"></div>
                        </div>
                        <p className="font-bold text-gray-900 mt-2">Customer Acceptance & Confirmation</p>
                        <p className="text-gray-500 text-[11px]">Sign & date to confirm order placement</p>
                    </div>
                </div>
            </div>

            {/* Document Footer */}
            <div className="mt-8 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3">
                <p>This is a computer-generated price quotation document. Quotation Ref: {quotation.quotationNumber}</p>
            </div>
        </div>
    );
});

PrintableQuotation.displayName = 'PrintableQuotation';

export default PrintableQuotation;

