import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Eye, DollarSign, Users, UserPlus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { 
    usePayrolls, 
    useProcessPayroll, 
    useEmployees, 
    useCreateEmployee,
    useUpdateEmployee 
} from '../features/hr/useHr';

const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const statusVariant = {
    draft: 'default', processed: 'warning', approved: 'info', paid: 'success', closed: 'default',
};

export default function PayrollsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' | 'employees'
    const [year, setYear] = useState(new Date().getFullYear());
    
    // Payroll data
    const { data: payrollsRes } = usePayrolls({ year });
    const processM = useProcessPayroll();
    const payrolls = payrollsRes?.data || [];

    // Employees data (for Owner & Staff salaries)
    const { data: employeesRes } = useEmployees({ limit: 100 });
    const employees = employeesRes?.data || [];
    const createEmpM = useCreateEmployee();
    const updateEmpM = useUpdateEmployee();

    // Process Payroll Modal State
    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
    const [processYear, setProcessYear] = useState(new Date().getFullYear());
    const [overtimeRate, setOvertimeRate] = useState(0);

    // Add / Edit Employee Salary Modal State
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [empForm, setEmpForm] = useState({
        firstName: '',
        lastName: '',
        designation: 'Managing Director / Owner',
        department: 'Executive Management',
        division: 'both',
        basicSalary: '',
        phone: '',
        nationalIdNumber: '',
        bankName: '',
        accountNumber: '',
        epfNumber: '',
    });

    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2
    }).format(n || 0);

    const activeEmployeesWithSalary = employees.filter((e) => e.status === 'active' && (e.basicSalary || 0) > 0);

    // Open Add Modal
    const handleOpenAddEmp = () => {
        setEditingEmp(null);
        setEmpForm({
            firstName: '',
            lastName: '',
            designation: 'Managing Director / Owner',
            department: 'Executive Management',
            division: 'both',
            basicSalary: '',
            phone: '',
            nationalIdNumber: '',
            bankName: '',
            accountNumber: '',
            epfNumber: '',
        });
        setIsEmpModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEditEmp = (emp) => {
        setEditingEmp(emp);
        setEmpForm({
            firstName: emp.firstName || '',
            lastName: emp.lastName || '',
            designation: emp.designation || 'Staff',
            department: emp.department || 'General',
            division: emp.division || 'both',
            basicSalary: emp.basicSalary || '',
            phone: emp.phone || emp.mobile || '',
            nationalIdNumber: emp.nationalIdNumber || '',
            bankName: emp.bankDetails?.bankName || '',
            accountNumber: emp.bankDetails?.accountNumber || '',
            epfNumber: emp.epfNumber || '',
        });
        setIsEmpModalOpen(true);
    };

    const handleSaveEmp = async (e) => {
        e.preventDefault();
        if (!empForm.firstName.trim()) {
            toast.error('First name is required');
            return;
        }
        if (!empForm.basicSalary || Number(empForm.basicSalary) <= 0) {
            toast.error('Please enter a valid monthly basic salary');
            return;
        }

        try {
            const payload = {
                firstName: empForm.firstName.trim(),
                lastName: empForm.lastName.trim() || empForm.firstName.trim(),
                displayName: `${empForm.firstName.trim()} ${empForm.lastName.trim()}`.trim(),
                designation: empForm.designation.trim(),
                department: empForm.department.trim(),
                division: empForm.division,
                basicSalary: Number(empForm.basicSalary),
                phone: empForm.phone.trim(),
                mobile: empForm.phone.trim(),
                nationalIdNumber: empForm.nationalIdNumber.trim(),
                epfNumber: empForm.epfNumber.trim(),
                bankDetails: {
                    bankName: empForm.bankName.trim(),
                    accountNumber: empForm.accountNumber.trim(),
                },
                status: 'active',
                employmentType: 'permanent',
            };

            if (editingEmp) {
                await updateEmpM.mutateAsync({ id: editingEmp._id, data: payload });
            } else {
                await createEmpM.mutateAsync(payload);
            }
            setIsEmpModalOpen(false);
        } catch { }
    };

    const submitProcess = async () => {
        if (activeEmployeesWithSalary.length === 0) {
            toast.error('Please add at least one salary profile (e.g. Owner) before processing payroll.');
            return;
        }

        try {
            const result = await processM.mutateAsync({
                periodMonth: +processMonth,
                periodYear: +processYear,
                overtimeRatePerHour: +overtimeRate || 0,
            });
            setIsProcessOpen(false);
            navigate(`/payroll/${result.data._id}`);
        } catch { }
    };

    const payrollColumns = [
        { key: 'payrollNumber', label: 'Ref', render: (r) => <span className="font-mono text-xs font-bold text-gray-800">{r.payrollNumber}</span> },
        { key: 'period', label: 'Month & Period', render: (r) => <span className="font-medium">{months[r.periodMonth - 1]?.label} {r.periodYear}</span> },
        { key: 'employees', label: 'People / Payslips', render: (r) => <Badge variant="info">{r.totalEmployees} Person(s)</Badge> },
        { key: 'gross', label: 'Gross Salary', render: (r) => fmt(r.totalGrossEarnings) },
        { key: 'deductions', label: 'Deductions (EPF/APIT)', render: (r) => r.totalDeductions > 0 ? <span className="text-red-600">-{fmt(r.totalDeductions)}</span> : '—' },
        { key: 'net', label: 'Net Disbursed', render: (r) => <span className="font-bold text-emerald-700">{fmt(r.totalNetPay)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
        {
            key: 'actions', label: '', width: '80px', render: (r) => (
                <button
                    onClick={() => navigate(`/payroll/${r._id}`)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                >
                    <Eye size={14} /> View
                </button>
            )
        },
    ];

    const employeeColumns = [
        {
            key: 'name', label: 'Name & Code', render: (r) => (
                <div>
                    <p className="font-semibold text-sm text-gray-900">{r.firstName} {r.lastName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.employeeCode}</p>
                </div>
            )
        },
        { key: 'designation', label: 'Designation / Role', render: (r) => <span className="font-medium text-gray-800">{r.designation || 'Staff'}</span> },
        {
            key: 'division', label: 'Division', render: (r) => {
                if (r.division === 'print_shop') return <Badge variant="info">Ink Printing Hub</Badge>;
                if (r.division === 'book_shop') return <Badge variant="warning">Pothmela Book Shop</Badge>;
                return <Badge variant="default">All / Combined</Badge>;
            }
        },
        { key: 'basicSalary', label: 'Monthly Basic Salary', render: (r) => <span className="font-mono font-bold text-gray-900">{fmt(r.basicSalary)}</span> },
        {
            key: 'bank', label: 'Bank Details', render: (r) => r.bankDetails?.bankName ? (
                <span className="text-xs text-gray-600">{r.bankDetails.bankName} - {r.bankDetails.accountNumber}</span>
            ) : <span className="text-xs text-gray-400">Cash / Direct</span>
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'default'}>{r.status}</Badge> },
        {
            key: 'actions', label: '', width: '80px', render: (r) => (
                <Button variant="outline" size="sm" onClick={() => handleOpenEditEmp(r)}>
                    Edit
                </Button>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Monthly Salaries & Payroll"
                description="Generate regular monthly salaries for yourself (business owner) and team, print A4 payslips, and record salary expenses."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={handleOpenAddEmp}>
                            <UserPlus size={16} className="mr-1.5 text-primary-600" /> + Add Owner / Staff Salary
                        </Button>
                        <Button variant="primary" onClick={() => setIsProcessOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800">
                            <Play size={16} className="mr-1.5" /> Process Monthly Payroll
                        </Button>
                    </div>
                }
            />

            {/* Quick Setup Banner if no salary profiles exist */}
            {activeEmployeesWithSalary.length === 0 && (
                <div className="p-5 bg-amber-50/90 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h4 className="font-bold text-amber-950 text-base flex items-center gap-2">
                            <Users className="text-amber-700" size={20} />
                            Owner / Staff Salary Profile Setup Needed
                        </h4>
                        <p className="text-sm text-amber-900 mt-1 max-w-2xl">
                            Even as a sole business owner, operating with a fixed monthly salary keeps your company accounts clean and lets you track profit accurately. Set up your profile with your monthly basic salary amount to start generating payslips.
                        </p>
                    </div>
                    <Button variant="primary" onClick={handleOpenAddEmp} className="whitespace-nowrap bg-amber-700 hover:bg-amber-800 text-white">
                        <Plus size={16} className="mr-1.5" /> Set Up Owner Salary Profile
                    </Button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 ${
                        activeTab === 'payroll'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <DollarSign size={16} /> Monthly Payroll Runs ({payrolls.length})
                </button>
                <button
                    onClick={() => setActiveTab('employees')}
                    className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 ${
                        activeTab === 'employees'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Users size={16} /> Salary Profiles &amp; Owners ({employees.length})
                </button>
            </div>

            {/* TAB 1: Payroll Runs */}
            {activeTab === 'payroll' && (
                <Card>
                    <div className="p-4 border-b flex justify-between items-center flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs uppercase font-bold text-gray-500">Filter Year:</span>
                            <div className="w-28">
                                <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">
                            {payrolls.length} payroll run(s) found for {year}
                        </p>
                    </div>
                    {payrolls.length === 0 ? (
                        <EmptyState
                            icon={DollarSign}
                            title={`No payroll runs recorded for ${year}`}
                            description="Click 'Process Monthly Payroll' to generate this month's salary payslips and records."
                            action={
                                <Button variant="primary" onClick={() => setIsProcessOpen(true)} className="mt-2">
                                    <Play size={16} className="mr-1.5" /> Process Payroll
                                </Button>
                            }
                        />
                    ) : (
                        <Table columns={payrollColumns} data={payrolls} onRowClick={(r) => navigate(`/payroll/${r._id}`)} />
                    )}
                </Card>
            )}

            {/* TAB 2: Employees / Owner Salary Profiles */}
            {activeTab === 'employees' && (
                <Card>
                    <div className="p-4 border-b flex justify-between items-center flex-wrap gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">Owner &amp; Employee Salary Setup</h3>
                            <p className="text-xs text-gray-500">
                                Define monthly basic salaries. When payroll is processed, each active profile receives a payslip.
                            </p>
                        </div>
                        <Button variant="primary" onClick={handleOpenAddEmp} size="sm">
                            <Plus size={14} className="mr-1" /> Add Salary Profile
                        </Button>
                    </div>

                    {employees.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="No salary profiles yet"
                            description="Add yourself (the Owner) or your staff members to get started."
                            action={
                                <Button variant="primary" onClick={handleOpenAddEmp} className="mt-2">
                                    <Plus size={16} className="mr-1.5" /> Add Owner Salary Profile
                                </Button>
                            }
                        />
                    ) : (
                        <Table columns={employeeColumns} data={employees} />
                    )}
                </Card>
            )}

            {/* Process Payroll Modal */}
            <Modal isOpen={isProcessOpen} onClose={() => setIsProcessOpen(false)} title="Process Monthly Payroll" size="md">
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                        <p className="font-semibold mb-1">
                            Eligible Profiles: {activeEmployeesWithSalary.length} active person(s) with salary set
                        </p>
                        <p className="text-xs text-blue-800">
                            The system will automatically generate official payslips for this period. Standard full-month attendance is credited automatically.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Period Month"
                            required
                            options={months}
                            value={processMonth}
                            onChange={(e) => setProcessMonth(e.target.value)}
                        />
                        <Input
                            label="Period Year"
                            required
                            type="number"
                            value={processYear}
                            onChange={(e) => setProcessYear(e.target.value)}
                        />
                    </div>

                    <Input
                        label="Overtime Rate (LKR per hour)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={overtimeRate}
                        onChange={(e) => setOvertimeRate(e.target.value)}
                        placeholder="0 = no overtime"
                    />

                    {/* Preview of active profiles */}
                    <div className="border rounded p-3 bg-gray-50 max-h-40 overflow-y-auto">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Profiles Included:</p>
                        {activeEmployeesWithSalary.map((emp) => (
                            <div key={emp._id} className="flex justify-between items-center text-xs py-1 border-b last:border-b-0">
                                <span>{emp.firstName} {emp.lastName} ({emp.designation || 'Owner/Staff'})</span>
                                <span className="font-mono font-semibold">{fmt(emp.basicSalary)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsProcessOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submitProcess} loading={processM.isPending} className="bg-slate-900 text-white hover:bg-slate-800">
                        Process &amp; Generate Payslips
                    </Button>
                </div>
            </Modal>

            {/* Add / Edit Salary Profile Modal */}
            <Modal
                isOpen={isEmpModalOpen}
                onClose={() => setIsEmpModalOpen(false)}
                title={editingEmp ? `Edit Salary Profile: ${editingEmp.firstName}` : 'Set Up Owner / Staff Salary Profile'}
                size="md"
            >
                <form onSubmit={handleSaveEmp} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            required
                            placeholder="e.g. Dilum / Owner"
                            value={empForm.firstName}
                            onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })}
                        />
                        <Input
                            label="Last Name"
                            placeholder="e.g. Perera"
                            value={empForm.lastName}
                            onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Designation / Role"
                            required
                            placeholder="e.g. Managing Director / Owner"
                            value={empForm.designation}
                            onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                        />
                        <Input
                            label="Monthly Basic Salary (LKR)"
                            required
                            type="number"
                            min="1000"
                            step="100"
                            placeholder="e.g. 150000"
                            value={empForm.basicSalary}
                            onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Assigned Division"
                            value={empForm.division}
                            onChange={(e) => setEmpForm({ ...empForm, division: e.target.value })}
                            options={[
                                { value: 'both', label: 'General / Both Divisions' },
                                { value: 'print_shop', label: 'Ink Printing Hub (pvt) Ltd' },
                                { value: 'book_shop', label: 'Pothmela Book Shop' },
                            ]}
                        />
                        <Input
                            label="Phone / Mobile"
                            placeholder="+94 77 XXX XXXX"
                            value={empForm.phone}
                            onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="National ID (NIC)"
                            placeholder="NIC number"
                            value={empForm.nationalIdNumber}
                            onChange={(e) => setEmpForm({ ...empForm, nationalIdNumber: e.target.value })}
                        />
                        <Input
                            label="EPF Number (Optional)"
                            placeholder="e.g. EPF-123"
                            value={empForm.epfNumber}
                            onChange={(e) => setEmpForm({ ...empForm, epfNumber: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Bank Name (For Payout)"
                            placeholder="e.g. Commercial Bank / Sampath"
                            value={empForm.bankName}
                            onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                        />
                        <Input
                            label="Bank Account Number"
                            placeholder="e.g. 1000xxxxxx"
                            value={empForm.accountNumber}
                            onChange={(e) => setEmpForm({ ...empForm, accountNumber: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsEmpModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" loading={createEmpM.isPending || updateEmpM.isPending}>
                            {editingEmp ? 'Update Profile' : 'Save Salary Profile'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
