import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, DollarSign, FileText, Printer } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { usePayroll, usePayrollActions } from '../features/hr/useHr';

const statusVariant = {
    draft: 'default', processed: 'warning', approved: 'info', paid: 'success', closed: 'default',
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayrollDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data } = usePayroll(id);
    const actions = usePayrollActions();
    const [confirmApprove, setConfirmApprove] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [division, setDivision] = useState('general');

    const p = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (!p) return <div className="py-16 text-center text-gray-500">Loading payroll details...</div>;

    const handleApprove = async () => {
        await actions.approve.mutateAsync(p._id);
        setConfirmApprove(false);
    };

    const handleMarkPaid = async () => {
        await actions.markPaid.mutateAsync({
            id: p._id,
            data: { paymentMethod, division }
        });
        setIsPayModalOpen(false);
    };

    const payslipColumns = [
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-medium text-sm text-gray-900">{r.employeeName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.employeeCode} · {r.designation || 'Staff'}</p>
                </div>
            )
        },
        {
            key: 'attendance', label: 'Attendance', render: (r) => (
                <div className="text-xs">
                    <p>Present: <span className="font-semibold">{r.daysPresent}/{r.workingDays}</span></p>
                    {r.unpaidLeaveDays > 0 && <p className="text-red-600">Unpaid: {r.unpaidLeaveDays}d</p>}
                </div>
            )
        },
        { key: 'basic', label: 'Basic Salary', render: (r) => fmt(r.basicSalary) },
        { key: 'gross', label: 'Gross', render: (r) => fmt(r.grossEarnings) },
        { key: 'epf', label: 'EPF (8%)', render: (r) => r.epfEmployeeContribution > 0 ? <span className="text-red-600">-{fmt(r.epfEmployeeContribution)}</span> : '—' },
        { key: 'apit', label: 'APIT', render: (r) => r.apitAmount > 0 ? <span className="text-red-600">-{fmt(r.apitAmount)}</span> : '—' },
        { key: 'totalDed', label: 'Total Ded.', render: (r) => r.totalDeductions > 0 ? <span className="text-red-600">-{fmt(r.totalDeductions)}</span> : '—' },
        { key: 'net', label: 'Net Pay', render: (r) => <span className="font-bold text-emerald-700">{fmt(r.netPay)}</span> },
        { key: 'payment', label: 'Status', render: (r) => <Badge variant={r.paymentStatus === 'paid' ? 'success' : 'default'}>{r.paymentStatus}</Badge> },
        {
            key: 'actions', label: '', width: '110px', render: (r) => (
                <button
                    onClick={() => navigate(`/payroll/${p._id}/payslip/${r.employeeId}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded border border-primary-200"
                >
                    <FileText size={14} /> Payslip
                </button>
            )
        },
    ];

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">{p.payrollNumber} <Badge variant={statusVariant[p.status]}>{p.status}</Badge></span>}
                description={`${monthNames[p.periodMonth - 1]} ${p.periodYear} · ${p.totalEmployees} employee(s)`}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate('/payroll')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {p.status === 'processed' && (
                            <Button variant="primary" onClick={() => setConfirmApprove(true)}>
                                <CheckCircle size={16} className="mr-1.5" /> Approve Payroll
                            </Button>
                        )}
                        {p.status === 'approved' && (
                            <Button variant="primary" onClick={() => setIsPayModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <DollarSign size={16} className="mr-1.5" /> Mark as Paid (Disburse)
                            </Button>
                        )}
                    </div>
                } />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-gray-600">Gross Earnings</p><p className="text-lg font-bold">{fmt(p.totalGrossEarnings)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Total Deductions</p><p className="text-lg font-bold text-red-600">{fmt(p.totalDeductions)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">EPF Employer (12%)</p><p className="text-lg font-bold text-gray-700">{fmt(p.totalEpfEmployer)}</p></Card>
                <Card className="p-4 bg-emerald-50/50 border border-emerald-200">
                    <p className="text-sm text-emerald-800 font-medium">Net Payable</p>
                    <p className="text-xl font-black text-emerald-700">{fmt(p.totalNetPay)}</p>
                </Card>
            </div>

            <Card>
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800">Generated Payslips ({p.payslips?.length || 0})</h3>
                    <p className="text-xs text-gray-500">Click &ldquo;Payslip&rdquo; to view or print the official A4 salary slip</p>
                </div>
                <Table columns={payslipColumns} data={p.payslips || []} />
            </Card>

            {/* Approve Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmApprove}
                onClose={() => setConfirmApprove(false)}
                onConfirm={handleApprove}
                title="Approve Monthly Payroll"
                message="Approve this payroll? Once approved, the payroll is locked and ready for payment disbursement."
                loading={actions.approve.isPending}
            />

            {/* Mark as Paid Modal with Division & Payment Method */}
            <Modal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                title="Disburse Salary & Mark as Paid"
                size="md"
            >
                <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-900">
                        <p className="font-semibold mb-1">Total Payout: {fmt(p.totalNetPay)}</p>
                        <p className="text-xs">
                            Marking this payroll as paid will record an automatic <strong>Expense</strong> in your accounts and reflect in your Profit &amp; Loss report.
                        </p>
                    </div>

                    <Select
                        label="Payment Method"
                        required
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        options={[
                            { value: 'bank_transfer', label: 'Bank Transfer' },
                            { value: 'cash', label: 'Cash Drawer / Petty Cash' },
                            { value: 'cheque', label: 'Cheque' },
                        ]}
                    />

                    <Select
                        label="Charge to Division / Business"
                        required
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        options={[
                            { value: 'general', label: 'General / Combined Business Expense' },
                            { value: 'print_shop', label: 'Ink Printing Hub (pvt) Ltd' },
                            { value: 'book_shop', label: 'Pothmela Book Shop' },
                        ]}
                    />
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleMarkPaid}
                        loading={actions.markPaid.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        Confirm Payout & Record Expense
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
