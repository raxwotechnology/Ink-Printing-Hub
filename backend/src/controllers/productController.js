import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

export const createProduct = asyncHandler(async (req, res) => {
    // Validate barcode uniqueness if provided
    if (req.body.barcode && req.body.barcode.trim()) {
        const existingBarcode = await Product.findOne({
            barcode: req.body.barcode.trim(),
            deletedAt: null,
        });
        if (existingBarcode) {
            res.status(400);
            throw new Error(`Barcode "${req.body.barcode.trim()}" is already assigned to product "${existingBarcode.name}" (${existingBarcode.productCode})`);
        }
    }

    const product = await Product.create({
        ...req.body,
        createdBy: req.user._id,
    });

    // Automatically create a StockItem entry for the default warehouse (or first warehouse)
    // so it shows up in the Stock Overview even with 0 stock.
    try {
        const Warehouse = mongoose.model('Warehouse');
        const StockItem = mongoose.model('StockItem');
        const defaultWh = await Warehouse.findOne({ isDefault: true }) || await Warehouse.findOne();
        
        if (defaultWh) {
            await StockItem.create({
                productId: product._id,
                warehouseId: defaultWh._id,
                productCode: product.productCode,
                productName: product.name,
                unitOfMeasure: product.unitOfMeasure,
                quantities: { onHand: 0, reserved: 0 },
                totalValue: 0
            });
        }
    } catch (err) {
        console.error('Initial stock record creation failed:', err);
    }

    const populated = await Product.findById(product._id)
        .populate('categoryId', 'name code')
        .populate('brandId', 'name');

    res.status(201).json({ success: true, data: populated });
});

export const getProducts = asyncHandler(async (req, res) => {
    const {
        search,
        categoryId,
        brandId,
        status,
        type,
        division,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { shortName: { $regex: search, $options: 'i' } },
            { productCode: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { barcode: { $regex: search, $options: 'i' } },
        ];
    }

    if (categoryId) filter.categoryId = categoryId;
    if (brandId) filter.brandId = brandId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (division && division !== 'all') {
        filter.division = { $in: [division, 'both'] };
    }

    if (minPrice || maxPrice) {
        filter.basePrice = {};
        if (minPrice) filter.basePrice.$gte = Number(minPrice);
        if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('categoryId', 'name code')
            .populate('brandId', 'name')
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit)),
        Product.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: products.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        data: products,
    });
});

export const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
        .populate('categoryId', 'name code')
        .populate('brandId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    res.json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    // Validate barcode uniqueness if provided
    if (req.body.barcode && req.body.barcode.trim()) {
        const existingBarcode = await Product.findOne({
            barcode: req.body.barcode.trim(),
            _id: { $ne: req.params.id },
            deletedAt: null,
        });
        if (existingBarcode) {
            res.status(400);
            throw new Error(`Barcode "${req.body.barcode.trim()}" is already assigned to product "${existingBarcode.name}" (${existingBarcode.productCode})`);
        }
    }

    // Update fields
    Object.assign(product, req.body);
    product.updatedBy = req.user._id;

    await product.save();

    const populated = await Product.findById(product._id)
        .populate('categoryId', 'name code')
        .populate('brandId', 'name');

    // Sync denormalized fields in StockItems
    try {
        const StockItem = mongoose.model('StockItem');
        await StockItem.updateMany(
            { productId: populated._id },
            { 
                productName: populated.name,
                productCode: populated.productCode,
                unitOfMeasure: populated.unitOfMeasure
            }
        );
    } catch (err) {
        console.error('StockItem sync failed:', err);
    }

    res.json({ success: true, data: populated });
});

/**
 * GET /api/products/barcode/:barcode
 * Dedicated POS Barcode Lookup
 */
export const getProductByBarcode = asyncHandler(async (req, res) => {
    const { barcode } = req.params;
    const { warehouseId, division } = req.query;

    if (!barcode || !barcode.trim()) {
        res.status(400);
        throw new Error('Barcode is required');
    }

    const cleanBarcode = barcode.trim();

    const product = await Product.findOne({
        barcode: cleanBarcode,
        deletedAt: null,
    }).populate('categoryId', 'name code').populate('brandId', 'name');

    if (!product) {
        res.status(404);
        throw new Error(`No product found with barcode "${cleanBarcode}"`);
    }

    if (product.status !== 'active') {
        res.status(400);
        throw new Error(`Product "${product.name}" is ${product.status} and cannot be sold`);
    }

    if (product.salesConfig?.sellable === false || product.canBeSold === false) {
        res.status(400);
        throw new Error(`Product "${product.name}" is marked as not for sale`);
    }

    const targetDivision = division || 'book_shop';
    if (product.division && product.division !== 'both' && product.division !== targetDivision) {
        const divName = product.division === 'print_shop' ? 'Print Shop' : 'Book Shop';
        res.status(400);
        throw new Error(`Product "${product.name}" belongs to ${divName} and cannot be billed under ${targetDivision === 'book_shop' ? 'Book Shop' : 'Print Shop'}`);
    }

    let availableStock = 0;
    if (warehouseId) {
        try {
            const StockItem = mongoose.model('StockItem');
            const stockItem = await StockItem.findOne({
                productId: product._id,
                warehouseId,
                batchNumber: null,
            });
            if (stockItem) {
                availableStock = Math.max(0, (stockItem.quantities?.onHand || 0) - (stockItem.quantities?.reserved || 0));
            }
        } catch (err) {
            console.error('Error fetching stock for barcode product:', err);
        }
    }

    res.json({
        success: true,
        data: {
            _id: product._id,
            name: product.name,
            productCode: product.productCode,
            barcode: product.barcode,
            sku: product.sku,
            basePrice: product.basePrice,
            unitOfMeasure: product.unitOfMeasure,
            division: product.division,
            availableStock,
            taxRate: product.tax?.taxRate || 0,
            taxable: product.tax?.taxable ?? false,
            tierPricing: product.tierPricing || [],
            category: product.categoryId?.name,
            status: product.status,
        },
    });
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    product.deletedAt = new Date();
    product.status = 'inactive';
    await product.save();
    res.json({ success: true, message: 'Product deleted' });
});