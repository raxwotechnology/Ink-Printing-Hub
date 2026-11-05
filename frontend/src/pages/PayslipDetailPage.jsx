import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { usePayslip } from '../features/hr/useHr';
import { useCompanySettings } from '../features/settings/useSettings';

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayslipDetailPage() {
    const { payrollId, employeeId } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = usePayslip(payrollId, employeeId);
    const { data: settingsRes } = useCompanySettings();

    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2
    }).format(n || 0);

    if (isLoading || !data?.data) {
        return <div className="py-16 text-center text-gray-500">Loading payslip...</div>;
    }

    const { payslip: ps, payroll, employee } = data.data;

    const s = settingsRes?.data || {};
    const divKey = employee?.division === 'book_shop' ? 'book_shop' : 'print_shop';
    const divSettings = s.divisions?.[divKey] || {};
    const companyName = divSettings.name || (divKey === 'print_shop' ? 'Ink Printing Hub (pvt) Ltd' : 'Pothmela Book Shop');
    const companyAddress = divSettings.address || s.address || 'Main Street, Colombo, Sri Lanka';
    const companyPhone = divSettings.phone || s.phone || '+94 11 234 5678';
    const companyEmail = divSettings.email || s.email || 'info@inkprintinghub.lk';
    const companyLogo = divSettings.logoUrl || s.logoUrl || '';

    return (
        <div>
            <div className="no-print">
                <PageHeader
                    title="Employee Payslip"
                    description={`${employee.firstName} ${employee.lastName} · ${monthNames[payroll.periodMonth - 1]} ${payroll.periodYear}`}
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => navigate(`/payroll/${payrollId}`)}>
                                <ArrowLeft size={16} className="mr-1.5" /> Back
                            </Button>
                            <Button variant="primary" onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800">
                                <Printer size={16} className="mr-1.5" /> Print Payslip (A4)
                            </Button>
                        </div>
                    }
                />
            </div>

            <style type="text/css" media="print">
                {`
                @page { size: A4 portrait; margin: 12mm; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-payslip-card {
                        box-shadow: none !important;
                        border: 1px solid #e5e7eb !important;
                        padding: 0 !important;
                        max-width: 100% !important;
                    }
                }
                `}
            </style>

            <Card className="print-payslip-card p-6 sm:p-10 max-w-3xl mx-auto bg-white border border-gray-200">
                {/* Header */}
                <div className="flex justify-between items-start pb-5 mb-6 border-b-2 border-gray-800">
                    <div>
                        {companyLogo && (
                            <img src={companyLogo} alt="Logo" className="h-12 mb-2 object-contain" />
                        )}
                        <h1 className="text-xl font-black text-gray-900">{companyName}</h1>
                        <p className="text-xs text-gray-600">{companyAddress}</p>
                        <p className="text-xs text-gray-600">Tel: {companyPhone} · Email: {companyEmail}</p>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-wider mb-1">
                            SALARY PAYSLIP
                        </span>
                        <h2 className="text-base font-bold text-gray-800 font-mono mt-1">{payroll.payrollNumber}</h2>
                        <p className="text-xs font-semibold text-gray-700">
                            Month: {monthNames[payroll.periodMonth - 1]} {payroll.periodYear}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            Period: {new Date(payroll.periodStartDate).toLocaleDateString('en-LK')} — {new Date(payroll.periodEndDate).toLocaleDateString('en-LK')}
                        </p>
                    </div>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 p-4 mb-6 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Employee Details</p>
                        <p className="font-bold text-sm text-gray-900">{employee.firstName} {employee.lastName}</p>
                        <p className="text-gray-600">Code: <span className="font-mono font-medium">{employee.employeeCode}</span></p>
                        <p className="text-gray-700 font-medium mt-0.5">Role / Designation: {employee.designation || 'Owner / Director'}</p>
                        <p className="text-gray-600">Department: {employee.department || 'Management'}</p>
                        {employee.nationalIdNumber && (
                            <p className="text-gray-600">NIC: {employee.nationalIdNumber}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Payment & Statutory</p>
                        <p className="text-gray-600">EPF No: <span className="font-mono font-medium">{employee.epfNumber || 'N/A'}</span></p>
                        <p className="text-gray-600">Bank: <span className="font-medium">{employee.bankDetails?.bankName || 'Direct / Cash'}</span></p>
                        {employee.bankDetails?.accountNumber && (
                            <p className="text-gray-600">Account: <span className="font-mono font-medium">{employee.bankDetails.accountNumber}</span></p>
                        )}
                        <p className="text-gray-600 mt-1">Payment Status: <span className="font-bold text-emerald-700 uppercase">{ps.paymentStatus || 'Pending'}</span></p>
                    </div>
                </div>

                {/* Attendance Summary */}
                <div className="mb-6 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">Attendance Summary</p>
                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        <div className="p-1.5 bg-white rounded border">
                            <p className="text-[10px] text-gray-500">Working Days</p>
                            <p className="font-bold text-gray-800 text-sm mt-0.5">{ps.workingDays}</p>
                        </div>
                        <div className="p-1.5 bg-white rounded border">
                            <p className="text-[10px] text-gray-500">Present</p>
                            <p className="font-bold text-emerald-700 text-sm mt-0.5">{ps.daysPresent}</p>
                        </div>
                        <div className="p-1.5 bg-white rounded border">
                            <p className="text-[10px] text-gray-500">Leave Days</p>
                            <p className="font-bold text-gray-800 text-sm mt-0.5">{ps.leaveDays || 0}</p>
                        </div>
                        <div className="p-1.5 bg-white rounded border">
                            <p className="text-[10px] text-gray-500">Unpaid Days</p>
                            <p className="font-bold text-red-600 text-sm mt-0.5">{ps.unpaidLeaveDays || 0}</p>
                        </div>
                        <div className="p-1.5 bg-white rounded border">
                            <p className="text-[10px] text-gray-500">OT Hours</p>
                            <p className="font-bold text-gray-800 text-sm mt-0.5">{ps.overtimeHours || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Earnings */}
                    <div>
                        <div className="bg-gray-100 p-2 font-bold text-xs uppercase tracking-wider text-gray-700 rounded-t">
                            Earnings
                        </div>
                        <table className="w-full text-xs border border-gray-200">
                            <tbody>
                                {(ps.earnings || []).map((e, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2 text-gray-700">{e.name}</td>
                                        <td className="p-2 text-right font-mono font-medium">{fmt(e.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                                    <td className="p-2 text-gray-900">Total Gross Earnings</td>
                                    <td className="p-2 text-right font-mono text-gray-900">{fmt(ps.grossEarnings)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Deductions */}
                    <div>
                        <div className="bg-gray-100 p-2 font-bold text-xs uppercase tracking-wider text-gray-700 rounded-t">
                            Deductions
                        </div>
                        <table className="w-full text-xs border border-gray-200">
                            <tbody>
                                {(ps.deductions || []).length > 0 ? (
                                    ps.deductions.map((d, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="p-2 text-gray-700">{d.name}</td>
                                            <td className="p-2 text-right font-mono text-red-600 font-medium">-{fmt(d.amount)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="border-b">
                                        <td className="p-2 text-gray-400 italic">No deductions</td>
                                        <td className="p-2 text-right font-mono text-gray-400">LKR 0.00</td>
                                    </tr>
                                )}
                                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                                    <td className="p-2 text-gray-900">Total Deductions</td>
                                    <td className="p-2 text-right font-mono text-red-600">-{fmt(ps.totalDeductions || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Net Salary Highlight */}
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-lg flex justify-between items-center mb-6">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-emerald-800">Net Salary Payable</p>
                        <p className="text-2xl font-black font-mono text-emerald-950 mt-0.5">{fmt(ps.netPay)}</p>
                    </div>
                    <div className="text-right text-[11px] text-emerald-900">
                        <p>Employer EPF (12%): <strong>{fmt(ps.epfEmployerContribution)}</strong></p>
                        <p>Employer ETF (3%): <strong>{fmt(ps.etfContribution)}</strong></p>
                        <p className="text-[10px] text-gray-500 mt-0.5 italic">*Statutory employer contributions</p>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-10 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-xs text-gray-600">
                    <div>
                        <div className="border-t border-gray-400 w-44 mx-auto mb-1"></div>
                        <p className="font-semibold text-gray-800">Prepared & Approved By</p>
                        <p className="text-[10px] text-gray-500">Authorized Officer / Management</p>
                    </div>
                    <div>
                        <div className="border-t border-gray-400 w-44 mx-auto mb-1"></div>
                        <p className="font-semibold text-gray-800">Employee Acknowledgment</p>
                        <p className="text-[10px] text-gray-500">Signature: __________________</p>
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 text-center mt-6">
                    Official payslip document generated by {companyName} Payroll System.
                </p>
            </Card>
        </div>
    );
}
