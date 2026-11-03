import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { productFormSchema } from './productSchemas';
import { useCategories, useBrands, useUoms, useCreateProduct, useUpdateProduct } from './useProducts';
import { useDivisionStore } from '../../store/divisionStore';

export default function ProductFormModal({ isOpen, onClose, product = null }) {
    const isEdit = !!product;
    const { activeDivision } = useDivisionStore();

    const { data: categoriesData } = useCategories();
    const { data: brandsData } = useBrands();
    const { data: uomsData } = useUoms();
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();

    const initialDivision = (activeDivision && activeDivision !== 'all') ? activeDivision : 'book_shop';

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            name: '',
            division: initialDivision,
            categoryId: '',
            brandId: '',
            unitOfMeasure: 'pcs',
            barcode: '',
            sku: '',
            buyingPrice: 0,
            profitPercentage: 0,
            basePrice: 0,
            reorderLevel: 5,
            status: 'active',
            type: 'trading',
            description: '',
            productType: 'finished_good',
            canBeSold: true,
            canBePurchased: true,
            productNature: 'single',
            variations: [],
            comboItems: [],
            tierPricing: [],
        },
    });

    useEffect(() => {
        if (isOpen && product) {
            const buying = product.costs?.standardCost || product.purchasePrice || 0;
            const selling = product.basePrice || 0;
            const profit = buying > 0 ? Number(((selling - buying) / buying * 100).toFixed(2)) : 0;

            reset({
                name: product.name || '',
                division: product.division || 'book_shop',
                categoryId: product.categoryId?._id || product.categoryId || '',
                brandId: product.brandId?._id || product.brandId || '',
                unitOfMeasure: product.unitOfMeasure || 'pcs',
                barcode: product.barcode || '',
                sku: product.sku || '',
                buyingPrice: buying,
                profitPercentage: profit,
                basePrice: selling,
                reorderLevel: product.stockLevels?.reorderLevel || 0,
                status: product.status || 'active',
                type: product.type || 'trading',
                description: product.description || '',
                productType: product.productType || 'finished_good',
                canBeSold: true,
                canBePurchased: true,
                productNature: 'single',
                variations: [],
                comboItems: [],
                tierPricing: [],
            });
        } else if (isOpen && !product) {
            reset({
                name: '',
                division: initialDivision,
                categoryId: '',
                brandId: '',
                unitOfMeasure: 'pcs',
                barcode: '',
                sku: '',
                buyingPrice: 0,
                profitPercentage: 0,
                basePrice: 0,
                reorderLevel: 5,
                status: 'active',
                type: 'trading',
                description: '',
                productType: 'finished_good',
                canBeSold: true,
                canBePurchased: true,
                productNature: 'single',
                variations: [],
                comboItems: [],
                tierPricing: [],
            });
        }
    }, [isOpen, product, reset]);

    const onSubmit = async (data) => {
        const payload = {
            name: data.name,
            shortName: data.name,
            sku: data.sku || undefined,
            barcode: data.barcode || undefined,
            division: data.division || 'book_shop',
            productType: 'finished_good',
            canBeSold: true,
            canBePurchased: true,
            canBeManufactured: false,
            description: data.description || undefined,
            categoryId: data.categoryId,
            brandId: data.brandId || undefined,
            type: 'trading',
            unitOfMeasure: data.unitOfMeasure,
            basePrice: Number(data.basePrice),
            purchasePrice: Number(data.buyingPrice || 0),
            costs: {
                ...(product?.costs || {}),
                standardCost: Number(data.buyingPrice || 0),
            },
            tax: {
                taxable: false,
                taxRate: 0,
            },
            stockLevels: {
                minimumLevel: Number(data.reorderLevel || 0),
                reorderLevel: Number(data.reorderLevel || 0),
                maximumLevel: 0,
            },
            status: data.status || 'active',
            productNature: 'single',
            variations: [],
            comboItems: [],
            tierPricing: [],
        };

        try {
            if (isEdit) {
                await updateProduct.mutateAsync({ id: product._id, data: payload });
            } else {
                await createProduct.mutateAsync(payload);
            }
            onClose();
        } catch {
            // Error toasts handled in hook
        }
    };

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.code})`,
    }));

    const brandOptions = [
        { value: '', label: 'None' },
        ...(brandsData?.data || []).map((b) => ({
            value: b._id,
            label: b.name,
        })),
    ];

    const uomOptions = (uomsData?.data || []).map((u) => ({
        value: u.symbol,
        label: `${u.name} (${u.symbol})`,
    }));

    const isLoading = createProduct.isPending || updateProduct.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Product — ${product?.productCode || product?.name}` : 'Create New Product'}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* 1. Basic Details */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 pb-1 border-b border-gray-100">
                        1. Product Information & Business Division
                    </h4>

                    {/* Business Division Selector */}
                    <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                            Select Business Division *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs font-bold ${
                                watch('division') === 'book_shop'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}>
                                <input
                                    type="radio"
                                    value="book_shop"
                                    {...register('division')}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>📘 Pothmela Book Shop</span>
                            </label>

                            <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs font-bold ${
                                watch('division') === 'print_shop'
                                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}>
                                <input
                                    type="radio"
                                    value="print_shop"
                                    {...register('division')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>🖨️ Ink Printing Hub</span>
                            </label>

                            <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs font-bold ${
                                watch('division') === 'both'
                                    ? 'bg-purple-50 border-purple-500 text-purple-800 ring-1 ring-purple-500'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}>
                                <input
                                    type="radio"
                                    value="both"
                                    {...register('division')}
                                    className="text-purple-600 focus:ring-purple-500"
                                />
                                <span>🔄 Both / Shared</span>
                            </label>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">
                            {watch('division') === 'book_shop' && '📘 Only available for billing & inventory under Pothmela Book Shop.'}
                            {watch('division') === 'print_shop' && '🖨️ Only available for billing & inventory under Ink Printing Hub (pvt) Ltd.'}
                            {watch('division') === 'both' && '🔄 Shared item available across both Book Shop and Print Shop.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                label="Product Name"
                                placeholder="e.g. Sublimation Ink 100ml Black"
                                required
                                error={errors.name?.message}
                                {...register('name')}
                            />
                        </div>

                        <Select
                            label="Category"
                            required
                            error={errors.categoryId?.message}
                            options={categoryOptions}
                            {...register('categoryId')}
                        />

                        <Select
                            label="Unit of Measure (UOM)"
                            required
                            error={errors.unitOfMeasure?.message}
                            options={uomOptions.length > 0 ? uomOptions : [{ value: 'pcs', label: 'Pieces (pcs)' }]}
                            {...register('unitOfMeasure')}
                        />

                        <Input
                            label="Barcode / EAN"
                            placeholder="Scan or enter barcode"
                            error={errors.barcode?.message}
                            {...register('barcode')}
                        />

                        <Input
                            label="SKU / Item Code"
                            placeholder="e.g. INK-BLK-100"
                            error={errors.sku?.message}
                            {...register('sku')}
                        />

                        <Select
                            label="Brand (Optional)"
                            error={errors.brandId?.message}
                            options={brandOptions}
                            {...register('brandId')}
                        />

                        <Select
                            label="Status"
                            required
                            error={errors.status?.message}
                            options={[
                                { value: 'active', label: 'Active (Available in POS)' },
                                { value: 'inactive', label: 'Inactive (Hidden)' },
                            ]}
                            {...register('status')}
                        />
                    </div>
                </div>

                {/* 2. Pricing */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 pb-1 border-b border-gray-100">
                        2. Pricing & Cost
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                        <Input
                            label="Cost / Buying Price (LKR)"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            error={errors.buyingPrice?.message}
                            {...register('buyingPrice', {
                                onChange: (e) => {
                                    const buy = parseFloat(e.target.value) || 0;
                                    const profit = watch('profitPercentage') || 0;
                                    const sell = buy * (1 + profit / 100);
                                    setValue('basePrice', parseFloat(sell.toFixed(2)));
                                },
                            })}
                        />

                        <Input
                            label="Profit Margin (%)"
                            type="number"
                            step="0.01"
                            placeholder="0"
                            error={errors.profitPercentage?.message}
                            {...register('profitPercentage', {
                                onChange: (e) => {
                                    const profit = parseFloat(e.target.value) || 0;
                                    const buy = watch('buyingPrice') || 0;
                                    const sell = buy * (1 + profit / 100);
                                    setValue('basePrice', parseFloat(sell.toFixed(2)));
                                },
                            })}
                        />

                        <Input
                            label="Selling Price (LKR)"
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            error={errors.basePrice?.message}
                            {...register('basePrice', {
                                onChange: (e) => {
                                    const sell = parseFloat(e.target.value) || 0;
                                    const buy = watch('buyingPrice') || 0;
                                    if (buy > 0) {
                                        const profit = ((sell - buy) / buy) * 100;
                                        setValue('profitPercentage', parseFloat(profit.toFixed(2)));
                                    }
                                },
                            })}
                        />
                    </div>
                </div>

                {/* 3. Inventory Alert & Description */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 pb-1 border-b border-gray-100">
                        3. Stock Alert & Notes
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Low Stock Alert Qty"
                            type="number"
                            placeholder="5"
                            error={errors.reorderLevel?.message}
                            {...register('reorderLevel')}
                        />
                        <div className="md:col-span-2">
                            <Textarea
                                label="Description / Notes"
                                rows={2}
                                placeholder="Short description or notes..."
                                error={errors.description?.message}
                                {...register('description')}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Save Changes' : 'Create Product'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
