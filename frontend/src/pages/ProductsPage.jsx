import { useState } from 'react';
import { Eye, Plus, Search, Edit, Trash2, Package } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProductFormModal from '../features/products/ProductFormModal';
import { useProducts, useCategories, useDeleteProduct } from '../features/products/useProducts';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    draft: 'warning',
    discontinued: 'danger',
};

export default function ProductsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '',
        categoryId: '',
        status: '',
        division: '',
        page: 1,
        limit: 10,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isView, setIsView] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deletingProduct, setDeletingProduct] = useState(null);

    const { data, isLoading, isFetching } = useProducts(filters);
    const { data: categoriesData } = useCategories();
    const deleteProduct = useDeleteProduct();

    const products = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: c.name,
    }));

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const columns = [
        {
            key: 'productCode',
            label: 'Code',
            width: '120px',
            render: (row) => <span className="font-mono text-xs">{row.productCode}</span>,
        },
        {
            key: 'name',
            label: 'Product',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {row.sku && <span className="text-xs text-gray-500">SKU: {row.sku}</span>}
                        {row.barcode && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                🏷️ {row.barcode}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'categoryId',
            label: 'Category',
            render: (row) => row.categoryId?.name || '—',
        },
        {
            key: 'division',
            label: 'Division',
            render: (row) => {
                if (row.division === 'print_shop') {
                    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">🖨️ Print Shop</span>;
                }
                if (row.division === 'both') {
                    return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">🔄 Both</span>;
                }
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">📘 Book Shop</span>;
            },
        },
        {
            key: 'brandId',
            label: 'Brand',
            render: (row) => row.brandId?.name || '—',
        },
        {
            key: 'purchasePrice',
            label: 'Purchase Price',
            render: (row) => <span className="font-medium">{formatPrice(row.purchasePrice || row.costs?.standardCost)}</span>,
        },
        {
            key: 'basePrice',
            label: 'Sell Price',
            render: (row) => <span className="font-medium text-primary-600">{formatPrice(row.basePrice)}</span>,
        },
        {
            key: 'callPrice',
            label: 'Call Price',
            render: (row) => row.callPrice > 0 ? (
                <div className="flex flex-col">
                    <span className="font-medium text-amber-700">{formatPrice(row.callPrice)}</span>
                    {row.callPriceUpdatedAt && (
                        <span className="text-[10px] text-gray-500 mt-0.5" title="Call Price Last Updated">
                            {new Date(row.callPriceUpdatedAt).toLocaleString()}
                        </span>
                    )}
                </div>
            ) : (
                <span className="text-gray-400 text-xs">—</span>
            ),
        },
        {
            key: 'profit',
            label: 'Profit (%)',
            render: (row) => {
                const cost = row.costs?.standardCost || 0;
                const price = row.basePrice || 0;
                if (cost <= 0) return <span className="text-gray-400">—</span>;
                const profit = ((price - cost) / cost * 100).toFixed(1);
                return (
                    <span className={`font-semibold ${+profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit}%
                    </span>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (row) => (
                <div className="flex gap-1">
                    {canManage && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); setEditingProduct(row); setIsView(true); setIsFormOpen(true); }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye size={16} /></button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProduct(row);
                                    setIsFormOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingProduct(row);
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        if (!deletingProduct) return;
        await deleteProduct.mutateAsync(deletingProduct._id);
        setDeletingProduct(null);
    };

    const handleClose = () => {
        setIsFormOpen(false);
        setEditingProduct(null); setIsView(false);
    };

    return (
        <div>
            <PageHeader
                title="Products"
                description="Manage your product catalog"
                actions={
                    canManage && (
                        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-1.5" />
                            Add Product
                        </Button>
                    )
                }
            />

            <Card>
                {/* Division Tabs */}
                <div className="px-4 pt-3 pb-0 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-1">
                        <button
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, division: '', page: 1 }))}
                            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                                !filters.division
                                    ? 'border-gray-900 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            All Products
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, division: 'book_shop', page: 1 }))}
                            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                filters.division === 'book_shop'
                                    ? 'border-emerald-600 text-emerald-700'
                                    : 'border-transparent text-gray-500 hover:text-emerald-700'
                            }`}
                        >
                            <span>📘 Pothmela Book Shop</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilters((f) => ({ ...f, division: 'print_shop', page: 1 }))}
                            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                                filters.division === 'print_shop'
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:text-blue-700'
                            }`}
                        >
                            <span>🖨️ Ink Printing Hub</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, code, barcode..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-48">
                        <Select disabled={isView} 
                            placeholder="All Categories"
                            options={categoryOptions}
                            value={filters.categoryId}
                            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-40">
                        <Select disabled={isView} 
                            placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'discontinued', label: 'Discontinued' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {/* Table / Empty / Loading */}
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading products...</div>
                ) : products.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No products found"
                        description={
                            filters.search || filters.categoryId || filters.status
                                ? 'Try adjusting your filters'
                                : 'Get started by adding your first product'
                        }
                        action={
                            canManage && !filters.search && (
                                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                    <Plus size={16} className="mr-1.5" />
                                    Add Product
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        <Table columns={columns} data={products} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}

                {isFetching && !isLoading && (
                    <div className="absolute inset-0 bg-white/30 pointer-events-none" />
                )}
            </Card>

            <ProductFormModal
                isOpen={isFormOpen}
                onClose={handleClose}
                product={editingProduct}
            />

            <ConfirmDialog
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${deletingProduct?.name}"? This action soft-deletes the product but can be restored by an admin.`}
                confirmText="Delete"
                variant="danger"
                loading={deleteProduct.isPending}
            />
        </div>
    );
}