import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, FileText, ArrowRight, Printer } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useQuotations } from '../features/quotations/useQuotations';
import { useAuthStore } from '../store/authStore';

const quotationStatusVariant = {
    draft: 'default',
    sent: 'info',
    accepted: 'success',
    rejected: 'danger',
    expired: 'warning',
    converted: 'primary',
};

export default function QuotationsPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'sales_manager', 'accountant', 'sales_rep'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        division: 'all',
        page: 1,
        limit: 15,
    });

    const { data, isLoading } = useQuotations(filters);

    const quotations = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    const columns = [
        {
            key: 'quotationNumber',
            label: 'Quotation #',
            width: '140px',
            render: (r) => (
                <span className="font-mono text-xs font-semibold text-primary-700">
                    {r.quotationNumber}
                </span>
            ),
        },
        {
            key: 'quotationDate',
            label: 'Date',
            render: (r) => fmtDate(r.quotationDate),
        },
        {
            key: 'customer',
            label: 'Customer',
            render: (r) => (
                <div>
                    <p className="font-medium text-gray-900">{r.customerSnapshot?.name || '—'}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.customerSnapshot?.code}</p>
                </div>
            ),
        },
        {
            key: 'division',
            label: 'Division',
            render: (r) => (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {r.division === 'print_shop' ? 'Print Shop' : 'Book Shop'}
                </span>
            ),
        },
        {
            key: 'validUntil',
            label: 'Valid Until',
            render: (r) => {
                if (!r.validUntil) return <span className="text-gray-400">—</span>;
                const isPast = new Date(r.validUntil) < new Date() && r.status !== 'converted' && r.status !== 'accepted';
                return (
                    <span className={`text-xs ${isPast ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {fmtDate(r.validUntil)}
                        {isPast && ' (Expired)'}
                    </span>
                );
            },
        },
        {
            key: 'grandTotal',
            label: 'Total',
            render: (r) => <span className="font-semibold text-gray-950">{fmt(r.grandTotal)}</span>,
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <div className="flex flex-col gap-1 items-start">
                    <Badge variant={quotationStatusVariant[r.status] || 'default'}>
                        {r.status ? r.status.toUpperCase() : 'DRAFT'}
                    </Badge>
                    {r.status === 'converted' && r.convertedToInvoiceId && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const invId = r.convertedToInvoiceId._id || r.convertedToInvoiceId;
                                navigate(`/invoices/${invId}`);
                            }}
                            className="inline-flex items-center text-[11px] text-primary-600 hover:underline font-mono"
                        >
                            {r.convertedToInvoiceId.invoiceNumber || 'View Invoice'}
                            <ArrowRight size={10} className="ml-0.5" />
                        </button>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            label: '',
            width: '80px',
            render: (r) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/quotations/${r._id}`);
                        }}
                        title="View Quotation"
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                    >
                        <Eye size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Quotations"
                description="Create, view, manage, and print sales price quotations"
                actions={canCreate && (
                    <Button variant="primary" onClick={() => navigate('/quotations/new')}>
                        <Plus size={16} className="mr-1.5" /> New Quotation
                    </Button>
                )}
            />

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by quotation # or customer..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>

                    <div className="w-44">
                        <Select
                            placeholder="All Statuses"
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'sent', label: 'Sent' },
                                { value: 'accepted', label: 'Accepted' },
                                { value: 'rejected', label: 'Rejected' },
                                { value: 'expired', label: 'Expired' },
                                { value: 'converted', label: 'Converted to Invoice' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        />
                    </div>

                    <div className="w-40">
                        <Select
                            placeholder="All Divisions"
                            options={[
                                { value: 'all', label: 'All Divisions' },
                                { value: 'print_shop', label: 'Print Shop' },
                                { value: 'book_shop', label: 'Book Shop' },
                            ]}
                            value={filters.division}
                            onChange={(e) => setFilters((f) => ({ ...f, division: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading quotations...</div>
                ) : quotations.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="No quotations found"
                        description="Create price quotations for customers before billing or order confirmation"
                        action={canCreate && (
                            <Button variant="primary" onClick={() => navigate('/quotations/new')}>
                                <Plus size={16} className="mr-1.5" /> Create First Quotation
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table
                            columns={columns}
                            data={quotations}
                            onRowClick={(r) => navigate(`/quotations/${r._id}`)}
                        />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}

