import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { deleteProduct } from '../../services/productService';
import { calculateProductCost } from '../../services/costingService';
import { formatCurrency } from '../../utils/helpers';
import { useCategories } from '../../context/CategoryContext';
import { FilterPanel } from './categories/FilterPanel';
import { useResizableColumns } from '../../hooks/useResizableColumns';

/**
 * Format currency from cents to AUD string
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted currency string
 */

/**
 * Product Catalog Table component
 * @description Displays all products in a searchable, filterable table with
 * actions for editing, deleting, and viewing BOM details.
 * @param {Object} props - Component props
 * @param {Function} props.onAddProduct - Callback to open add product modal
 * @param {Function} props.onEditProduct - Callback to edit a product
 * @returns {JSX.Element} Rendered product catalog table
 */
export const ProductCatalogTable = ({ onAddProduct, onEditProduct, refreshTrigger = 0 }) => {
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [manufacturingCosts, setManufacturingCosts] = useState({});
    const [partCatalogVersion, setPartCatalogVersion] = useState(0);
    const [fastenerCatalogVersion, setFastenerCatalogVersion] = useState(0);
    const [productCatalogVersion, setProductCatalogVersion] = useState(0);
    const [subAssemblyCatalogVersion, setSubAssemblyCatalogVersion] = useState(0);
    const [labourRateVersion, setLabourRateVersion] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [categoryFilters, setCategoryFilters] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'asc' });
    const { categories } = useCategories();
    const tableRef = useRef(null);

    // Resizable columns
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([120, 250, 150, 150, 120, 120, 100, 80, 100]);

    // Load products from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'products'), (snap) => {
            const productsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            productsList.sort((a, b) => a.name.localeCompare(b.name));
            setProducts(productsList);
            setLoading(false);
            setProductCatalogVersion(prev => prev + 1);
        });

        return () => unsubscribe();
    }, []);

    // Listen to part catalog changes to trigger cost recalculation
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'part_catalog'), () => {
            setPartCatalogVersion(prev => prev + 1);
        });

        return () => unsubscribe();
    }, []);

    // Listen to fastener catalog changes to trigger cost recalculation
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'fastener_catalog'), () => {
            setFastenerCatalogVersion(prev => prev + 1);
        });

        return () => unsubscribe();
    }, []);

    // Listen to sub assembly catalog changes to trigger cost recalculation
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sub_assemblies'), () => {
            setSubAssemblyCatalogVersion(prev => prev + 1);
        });

        return () => unsubscribe();
    }, []);

    // Listen to labour rate changes to trigger cost recalculation
    useEffect(() => {
        const labourRateDoc = doc(db, 'app_settings', 'labour_rate');
        const unsubscribe = onSnapshot(labourRateDoc, () => {
            setLabourRateVersion(prev => prev + 1);
        });

        return () => unsubscribe();
    }, []);

    // Real-time listener for inventory state
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'inventory_state'),
            (snapshot) => {
                const inventoryList = snapshot.docs.map(doc => doc.data());
                setInventory(inventoryList);
            },
            (error) => {
                console.error('[ProductCatalog] Error fetching inventory:', error);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load manufacturing costs for all products
    useEffect(() => {
        const loadCosts = async () => {
            const costs = {};
            for (const product of products) {
                try {
                    const result = await calculateProductCost(product.id);
                    costs[product.id] = result.totalCost;
                    console.log(`[ProductCatalog] Cost for ${product.name} (${product.id}):`, result.totalCost);
                } catch (error) {
                    console.error(`Error calculating cost for ${product.id}:`, error);
                    costs[product.id] = 0;
                }
            }
            console.log('[ProductCatalog] All costs calculated:', costs);
            setManufacturingCosts(costs);
        };

        if (products.length > 0) {
            loadCosts();
        }
    }, [products, refreshTrigger, partCatalogVersion, fastenerCatalogVersion, productCatalogVersion, subAssemblyCatalogVersion, labourRateVersion]);

    const handleDelete = async (product) => {
        if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteProduct(product.id);
        } catch (error) {
            alert(`Failed to delete product: ${error.message}`);
        }
    };

    // Helper to get category name by ID
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : '';
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <Icons.ChevronsUpDown size={14} className="ml-1 text-slate-600" />;
        }
        return sortConfig.direction === 'asc' ?
            <Icons.ChevronUp size={14} className="ml-1 text-cyan-400" /> :
            <Icons.ChevronDown size={14} className="ml-1 text-cyan-400" />;
    };

    // Enhance products with actual stock counts and calculated values
    const processedProducts = products.map(product => {
        // Calculate actual stock count from inventory_state
        const actualStockCount = inventory
            .filter(inv => inv.partId === product.id)
            .reduce((total, inv) => total + (inv.quantity || 0), 0);

        // Calculate Manufacturing Cost
        const mfgCost = product.costType === 'MANUAL'
            ? (product.manualCost || 0)
            : (manufacturingCosts[product.id] || 0);

        // Calculate List Price
        let listPrice;
        // Check both isSaleable flag (if present) and listPriceSource
        const isSaleable = product.isSaleable !== false; // Default to true if undefined for backward compatibility, or check logic
        // Actually, based on modal, if it's not in data, it was treating as false? 
        // In modal: isSaleable: editingProduct.isSaleable || false
        // But invalid/legacy data might want to show calculated prices if they were set?
        // Let's stick to the calculation logic. If isSaleable is explicitly false, listPrice is 0.

        if (product.isSaleable === false) {
            listPrice = 0;
        } else if (product.listPriceSource === 'CALCULATED') {
            const marginPercent = (product.targetMarginPercent || 0) / 100;
            if (marginPercent >= 1 || mfgCost === 0) {
                listPrice = 0;
            } else {
                listPrice = Math.round(mfgCost / (1 - marginPercent));
            }
        } else {
            listPrice = product.listPrice || 0;
        }

        // Calculate Margin
        let actualMargin = 0;
        if (listPrice > 0) {
            actualMargin = ((listPrice - mfgCost) / listPrice) * 100;
        }

        return {
            ...product,
            actualStockCount,
            mfgCost,
            finalListPrice: listPrice,
            actualMargin,
            categoryName: getCategoryName(product.categoryId),
            subcategoryName: getCategoryName(product.subcategoryId)
        };
    });

    // Filter products based on search term and category filters (using processed data)
    let filteredProducts = processedProducts.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        const categoryName = (product.categoryName || '').toLowerCase();
        const subcategoryName = (product.subcategoryName || '').toLowerCase();
        const legacyCategory = (product.category || '').toLowerCase();

        return product.name.toLowerCase().includes(searchLower) ||
            product.sku.toLowerCase().includes(searchLower) ||
            categoryName.includes(searchLower) ||
            subcategoryName.includes(searchLower) ||
            legacyCategory.includes(searchLower);
    });

    // Apply category filters
    if (categoryFilters.length > 0) {
        filteredProducts = filteredProducts.filter(product => {
            if (!product.categoryId && !product.subcategoryId) return false;
            return categoryFilters.some(filterId =>
                filterId === product.categoryId || filterId === product.subcategoryId
            );
        });
    }

    // Sort filtered products
    filteredProducts.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle specific columns that might need special sorting logic
        if (sortConfig.key === 'category') {
            aValue = a.categoryName || a.category || '';
            bValue = b.categoryName || b.category || '';
        } else if (sortConfig.key === 'subcategory') {
            aValue = a.subcategoryName || '';
            bValue = b.subcategoryName || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icons.Loader className="animate-spin text-cyan-400" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center">
            <div className="w-full max-w-fit space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Product Catalog</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {categoryFilters.length > 0
                                ? `Showing ${filteredProducts.length} of ${products.length} products (filtered)`
                                : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isFilterOpen || categoryFilters.length > 0
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            <Icons.Filter size={18} />
                            Filter
                            {categoryFilters.length > 0 && (
                                <span className="bg-white text-cyan-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {categoryFilters.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={onAddProduct}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                        >
                            <Icons.Plus size={18} />
                            Add Product
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {isFilterOpen && (
                    <FilterPanel
                        onApply={(filters) => {
                            setCategoryFilters(filters);
                            setIsFilterOpen(false);
                        }}
                        onClose={() => setIsFilterOpen(false)}
                        activeFilters={categoryFilters}
                    />
                )}

                {/* Search */}
                <div className="relative">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search products by name, SKU, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                {/* Table */}
                {filteredProducts.length > 0 ? (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                                <thead className="bg-slate-900 border-b border-slate-700">
                                    <tr>
                                        <th onClick={() => handleSort('sku')} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[0]}px` }}>
                                            <div className="column-content flex items-center">SKU <SortIcon columnKey="sku" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(0, e)} onDoubleClick={() => autoFitColumn(0, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('name')} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[1]}px` }}>
                                            <div className="column-content flex items-center">Name <SortIcon columnKey="name" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(1, e)} onDoubleClick={() => autoFitColumn(1, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('functionalCategory')} className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[2]}px` }}>
                                            <div className="column-content flex items-center justify-center">Comp. Type <SortIcon columnKey="functionalCategory" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('componentCategory')} className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[3]}px` }}>
                                            <div className="column-content flex items-center justify-center">CE Category <SortIcon columnKey="componentCategory" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(3, e)} onDoubleClick={() => autoFitColumn(3, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('mfgCost')} className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[4]}px` }}>
                                            <div className="column-content flex items-center justify-end">Cost Price <SortIcon columnKey="mfgCost" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(4, e)} onDoubleClick={() => autoFitColumn(4, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('finalListPrice')} className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[5]}px` }}>
                                            <div className="column-content flex items-center justify-end">List Price <SortIcon columnKey="finalListPrice" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(5, e)} onDoubleClick={() => autoFitColumn(5, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('actualMargin')} className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[6]}px` }}>
                                            <div className="column-content flex items-center justify-end">Margin <SortIcon columnKey="actualMargin" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(6, e)} onDoubleClick={() => autoFitColumn(6, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th onClick={() => handleSort('actualStockCount')} className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider relative cursor-pointer hover:bg-slate-800 transition-colors" style={{ width: `${columnWidths[7]}px` }}>
                                            <div className="column-content flex items-center justify-center">Stock <SortIcon columnKey="actualStockCount" /></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(7, e)} onDoubleClick={() => autoFitColumn(7, tableRef)} onClick={(e) => e.stopPropagation()} title="Drag to resize, double-click to auto-fit" />
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider relative" style={{ width: `${columnWidths[8]}px` }}>
                                            <div className="column-content">Actions</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filteredProducts.map(product => (
                                        <tr key={product.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-cyan-400">
                                                {product.sku}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-white">
                                                    {product.name}
                                                </div>
                                                {product.description && (
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {product.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-slate-300">
                                                {product.functionalCategory ? (
                                                    <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600">
                                                        {product.functionalCategory}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-slate-300">
                                                {product.componentCategory ? (
                                                    <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-300 rounded border border-blue-500/30">
                                                        {product.componentCategory}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="font-medium text-slate-200">
                                                        {product.mfgCost > 0 ? formatCurrency(product.mfgCost) : <span className="text-slate-500">--</span>}
                                                    </span>
                                                    {product.costType === 'MANUAL' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-medium rounded border border-purple-500/30" title="Manual cost entry">
                                                            <Icons.Edit size={12} />
                                                            Manual
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="font-medium text-slate-200">
                                                        {product.finalListPrice > 0 ? formatCurrency(product.finalListPrice) : <span className="text-slate-500">--</span>}
                                                    </span>
                                                    {product.listPriceSource === 'CALCULATED' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-medium rounded border border-cyan-500/30" title="Auto-calculated from BOM cost + margin">
                                                            <Icons.Calculator size={12} />
                                                            Auto
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {(() => {
                                                    const { finalListPrice, mfgCost, actualMargin, targetMarginPercent } = product;

                                                    if (!finalListPrice || finalListPrice === 0) {
                                                        return <span className="text-slate-500">--</span>;
                                                    }

                                                    const targetMargin = targetMarginPercent || 0;

                                                    let colorClass = 'text-slate-400';
                                                    if (actualMargin < 0) {
                                                        colorClass = 'text-red-400';
                                                    } else if (actualMargin >= targetMargin) {
                                                        colorClass = 'text-emerald-400';
                                                    } else {
                                                        colorClass = 'text-amber-400';
                                                    }

                                                    return (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className={`font-bold ${colorClass}`}>
                                                                {actualMargin.toFixed(1)}%
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                (Target: {targetMargin}%)
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {product.trackStock ? (
                                                    <span className={`font-medium ${product.actualStockCount <= product.reorderLevel
                                                        ? 'text-red-400'
                                                        : product.actualStockCount <= product.reorderLevel * 1.5
                                                            ? 'text-amber-400'
                                                            : 'text-emerald-400'
                                                        }`}>
                                                        {product.actualStockCount || 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => onEditProduct(product)}
                                                        className="p-2 hover:bg-slate-600 text-blue-400 rounded transition-colors"
                                                        title="Edit product"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                        title="Delete product"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400 bg-slate-800/30 rounded-lg border border-dashed border-slate-700">
                        <Icons.Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No products found</p>
                        <p className="text-sm">
                            {searchTerm ? 'Try a different search term' : 'Click "Add Product" to create your first product'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
