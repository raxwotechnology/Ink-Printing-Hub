import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { financialReportsApi } from '../features/reports/financialReportsApi';

export default function FinancialReportPage() {
    const navigate = useNavigate();

    // Default to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [selectedDivision, setSelectedDivision] = useState('all');

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['financial-reports', 'pnl', startDate, endDate, selectedDivision],
        queryFn: () => financialReportsApi.getProfitAndLoss({ startDate, endDate, division: selectedDivision }),
        keepPreviousData: true,
    });

    const report = reportData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    return (
        <div>
            <PageHeader 
                title="Profit & Loss Report" 
                description="Overview of your business revenue, costs, and net profit"
                actions={
                    <Button variant="outline" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back to Reports
                    </Button>
                }
            />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border">
                <div className="flex gap-4 items-end">
                    <Input type="date" label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input type="date" label="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Business Division</label>
                    <div className="inline-flex p-1 bg-gray-100 rounded-lg border">
                        <button
                            type="button"
                            onClick={() => setSelectedDivision('all')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${selectedDivision === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            All Divisions
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedDivision('book_shop')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${selectedDivision === 'book_shop' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:text-emerald-700'}`}
                        >
                            Pothmela Book Shop
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedDivision('print_shop')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${selectedDivision === 'print_shop' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-blue-700'}`}
                        >
                            Ink Printing Hub
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && !report ? (
                <div className="py-12 text-center text-gray-500">Loading report...</div>
            ) : report ? (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                                <h3 className="font-semibold text-gray-600">Total Revenue</h3>
                            </div>
                            <p className="text-3xl font-black text-blue-700">{fmt(report.revenue)}</p>
                            <p className="text-xs text-gray-500 mt-2">Billed Invoices</p>
                        </Card>
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Activity size={20} /></div>
                                <h3 className="font-semibold text-gray-600">Total Expenses</h3>
                            </div>
                            <p className="text-3xl font-black text-red-700">{fmt(report.expenses)}</p>
                            <p className="text-xs text-gray-500 mt-2">Billed Expenses</p>
                        </Card>
                        <Card className={`p-6 ${report.grossProfit >= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${report.grossProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                    <DollarSign size={20} />
                                </div>
                                <h3 className="font-semibold text-gray-700">Gross Profit</h3>
                            </div>
                            <p className={`text-3xl font-black ${report.grossProfit >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                                {fmt(report.grossProfit)}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Revenue - Expenses</p>
                        </Card>
                        <Card className={`p-6 ${report.netCashFlow >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${report.netCashFlow >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    <Activity size={20} />
                                </div>
                                <h3 className="font-semibold text-gray-700">Net Cash Flow</h3>
                            </div>
                            <p className={`text-3xl font-black ${report.netCashFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {fmt(report.netCashFlow)}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Collected - Paid</p>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cash Flow Breakdown */}
                        <Card className="p-0 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b font-semibold text-gray-700">Cash Flow</div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Collected</span>
                                        <span className="text-green-600">{fmt(report.collected)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Paid</span>
                                        <span className="text-red-600">-{fmt(report.paid)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t font-semibold">
                                        <span>Net Cash Flow</span>
                                        <span className={report.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {fmt(report.netCashFlow)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Receivables & Payables */}
                        <Card className="p-0 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b font-semibold text-gray-700">Accounts Summary</div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Accounts Receivable (AR)</span>
                                        <span className="text-blue-600">{fmt(report.accountsReceivable?.total || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Accounts Payable (AP)</span>
                                        <span className="text-orange-600">{fmt(report.accountsPayable?.total || 0)}</span>
                                    </div>
                                </div>
                                <div className="pt-4 mt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-gray-600">Collection Efficiency</span>
                                        <span className="text-lg font-black text-gray-800">{report.collectionEfficiency}%</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
