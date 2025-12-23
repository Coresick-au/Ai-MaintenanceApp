import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { deleteProduct } from '../../services/productService';
import { calculateProductCost } from '../../services/costingService';
import { formatCurrency } from '../../utils/helpers';
import { useCategories } from '../../context/CategoryContext';
import { FilterPanel } from './categories/FilterPanel';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [manufacturingCosts, setManufacturingCosts] = useState({});
    const [partCatalogVersion, setPartCatalogVersion] = useState(0);
    const [fastenerCatalogVersion, setFastenerCatalogVersion] = useState(0);
    const [productCatalogVersion, setProductCatalogVersion] = useState(0);
    const [labourRateVersion, setLabourRateVersion] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [categoryFilters, setCategoryFilters] = useState([]);
    const { categories } = useCategories();

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

    // Listen to labour rate changes to trigger cost recalculation
    useEffect(() => {
        const labourRateDoc = doc(db, 'app_settings', 'labour_rate');
        const unsubscribe = onSnapshot(labourRateDoc, () => {
            setLabourRateVersion(prev => prev + 1);
        });

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
                } catch (error) {
                    console.error(`Error calculating cost for ${product.id}:`, error);
                    costs[product.id] = 0;
                }
            }
            setManufacturingCosts(costs);
        };

        if (products.length > 0) {
            loadCosts();
        }
    }, [products, refreshTrigger, partCatalogVersion, fastenerCatalogVersion, productCatalogVersion, labourRateVersion]);

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

    // Filter products based on search term and category filters
    let filteredProducts = products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        const categoryName = getCategoryName(product.categoryId)?.toLowerCase() || '';
        const subcategoryName = getCategoryName(product.subcategoryId)?.toLowerCase() || '';
        const legacyCategory = product.category?.toLowerCase() || '';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Icons.Loader className="animate-spin text-cyan-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
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
                        <table className="w-full">
                            <thead className="bg-slate-900 border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        SKU
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Subcategory
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Cost Price
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        List Price
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Margin
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Actions
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
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-500/30">
                                                {getCategoryName(product.categoryId) || product.category || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {product.subcategoryId ? (
                                                <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-300 rounded border border-purple-500/30">
                                                    {getCategoryName(product.subcategoryId)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-medium text-slate-200">
                                                    {(() => {
                                                        const mfgCost = product.costType === 'MANUAL'
                                                            ? (product.manualCost || 0)
                                                            : (manufacturingCosts[product.id] || 0);
                                                        return mfgCost > 0 ? formatCurrency(mfgCost) : <span className="text-slate-500">--</span>;
                                                    })()}
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
                                                    {(() => {
                                                        // Calculate list price based on source
                                                        let listPrice;
                                                        if (product.listPriceSource === 'CALCULATED') {
                                                            const mfgCost = product.costType === 'MANUAL'
                                                                ? (product.manualCost || 0)
                                                                : (manufacturingCosts[product.id] || 0);
                                                            const marginPercent = (product.targetMarginPercent || 0) / 100;
                                                            if (marginPercent >= 1 || mfgCost === 0) {
                                                                listPrice = 0;
                                                            } else {
                                                                listPrice = Math.round(mfgCost / (1 - marginPercent));
                                                            }
                                                        } else {
                                                            listPrice = product.listPrice || 0;
                                                        }
                                                        return listPrice > 0 ? formatCurrency(listPrice) : <span className="text-slate-500">--</span>;
                                                    })()}
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
                                                // Calculate list price based on source
                                                let listPrice;
                                                if (product.listPriceSource === 'CALCULATED') {
                                                    const mfgCost = product.costType === 'MANUAL'
                                                        ? (product.manualCost || 0)
                                                        : (manufacturingCosts[product.id] || 0);
                                                    const marginPercent = (product.targetMarginPercent || 0) / 100;
                                                    if (marginPercent >= 1 || mfgCost === 0) {
                                                        listPrice = 0;
                                                    } else {
                                                        listPrice = Math.round(mfgCost / (1 - marginPercent));
                                                    }
                                                } else {
                                                    listPrice = product.listPrice || 0;
                                                }

                                                // Use manual cost if costType is MANUAL, otherwise use calculated cost
                                                const mfgCost = product.costType === 'MANUAL'
                                                    ? (product.manualCost || 0)
                                                    : (manufacturingCosts[product.id] || 0);

                                                if (listPrice === 0) {
                                                    return <span className="text-slate-500">--</span>;
                                                }

                                                const actualMargin = ((listPrice - mfgCost) / listPrice) * 100;
                                                const targetMargin = product.targetMarginPercent || 0;

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
    );
};
