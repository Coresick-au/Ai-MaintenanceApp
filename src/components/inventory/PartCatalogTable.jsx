import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { getLowestSupplierPrice } from '../../services/partPricingService';
import { formatCurrency } from '../../utils/helpers';
import { deletePart } from '../../services/inventoryService';
import { FilterPanel } from './categories/FilterPanel';
import { useCategories } from '../../context/CategoryContext';

export const PartCatalogTable = ({ onAddPart, onEditPart }) => {
    const [parts, setParts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'ascending' });
    const [loading, setLoading] = useState(true);
    const [viewingPart, setViewingPart] = useState(null);
    const [lowestPrices, setLowestPrices] = useState({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [categoryFilters, setCategoryFilters] = useState([]);
    const { categories } = useCategories();

    // Real-time listener for parts catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'part_catalog'),
            (snapshot) => {
                const partsList = snapshot.docs.map(doc => doc.data());
                setParts(partsList);
                setLoading(false);
            },
            (error) => {
                console.error('[PartCatalog] Error fetching parts:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load lowest supplier prices for all parts
    useEffect(() => {
        const loadLowestPrices = async () => {
            const prices = {};
            for (const part of parts) {
                if (part.id && part.costPriceSource === 'SUPPLIER_LOWEST') {
                    try {
                        const validSuppliers = part.suppliers || [];
                        const lowest = await getLowestSupplierPrice(part.id, new Date(), validSuppliers);
                        if (lowest) {
                            prices[part.id] = lowest.costPrice;
                        }
                    } catch (err) {
                        console.error(`Error loading lowest price for ${part.id}:`, err);
                    }
                }
            }
            setLowestPrices(prices);
        };

        if (parts.length > 0) {
            loadLowestPrices();
        }
    }, [parts]);

    // Calculate actual margin for each part using active cost
    const partsWithMargins = useMemo(() => {
        return parts.map(part => {
            // Determine active cost based on source
            const activeCost = part.costPriceSource === 'SUPPLIER_LOWEST' && lowestPrices[part.id]
                ? lowestPrices[part.id]
                : part.costPrice;

            const actualMargin = part.listPrice > 0
                ? ((part.listPrice - activeCost) / part.listPrice) * 100
                : 0;

            return {
                ...part,
                activeCost,
                actualMarginPercent: actualMargin
            };
        });
    }, [parts, lowestPrices]);

    // Helper to get category name by ID
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : '';
    };

    // Filter and sort
    const filteredAndSortedParts = useMemo(() => {
        let filtered = partsWithMargins.filter(part => {
            const searchLower = searchTerm.toLowerCase();
            const categoryName = getCategoryName(part.categoryId)?.toLowerCase() || '';
            const subcategoryName = getCategoryName(part.subcategoryId)?.toLowerCase() || '';

            return part.name.toLowerCase().includes(searchLower) ||
                part.sku.toLowerCase().includes(searchLower) ||
                categoryName.includes(searchLower) ||
                subcategoryName.includes(searchLower);
        });

        // Apply category filters
        if (categoryFilters.length > 0) {
            filtered = filtered.filter(part => {
                if (!part.categoryId && !part.subcategoryId) return false;
                return categoryFilters.some(filterId =>
                    filterId === part.categoryId || filterId === part.subcategoryId
                );
            });
        }

        filtered.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Special handling for category/subcategory sorting
            if (sortConfig.key === 'categoryId') {
                aVal = getCategoryName(a.categoryId) || '';
                bVal = getCategoryName(b.categoryId) || '';
            } else if (sortConfig.key === 'subcategoryId') {
                aVal = getCategoryName(a.subcategoryId) || '';
                bVal = getCategoryName(b.subcategoryId) || '';
            }

            // Handle null/undefined values (sort to end)
            if (!aVal && bVal) return 1;
            if (aVal && !bVal) return -1;
            if (!aVal && !bVal) return 0;

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [partsWithMargins, searchTerm, sortConfig, categoryFilters, categories]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <Icons.ChevronsUpDown size={14} className="text-slate-500" />;
        return sortConfig.direction === 'ascending'
            ? <Icons.ChevronUp size={14} className="text-cyan-400" />
            : <Icons.ChevronDown size={14} className="text-cyan-400" />;
    };



    const getMarginColor = (actual, target) => {
        if (actual >= target) return 'text-emerald-400';
        if (actual >= target * 0.9) return 'text-amber-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading catalog...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by SKU or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="text-sm text-slate-400">
                        {categoryFilters.length > 0
                            ? `Showing ${filteredAndSortedParts.length} of ${partsWithMargins.length} parts (filtered)`
                            : `${filteredAndSortedParts.length} part${filteredAndSortedParts.length !== 1 ? 's' : ''}`
                        }
                    </div>
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
                        onClick={onAddPart}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                    >
                        <Icons.Plus size={18} />
                        Add Part
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

            {/* Table */}
            <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('sku')}>
                                <div className="flex items-center gap-2">
                                    SKU {getSortIcon('sku')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-2">
                                    Name {getSortIcon('name')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('categoryId')}>
                                <div className="flex items-center gap-2">
                                    Category {getSortIcon('categoryId')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('subcategoryId')}>
                                <div className="flex items-center gap-2">
                                    Subcategory {getSortIcon('subcategoryId')}
                                </div>
                            </th>
                            <th className="px-4 py-3">
                                Suppliers
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('costPrice')}>
                                <div className="flex items-center justify-end gap-2">
                                    Cost {getSortIcon('costPrice')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('listPrice')}>
                                <div className="flex items-center justify-end gap-2">
                                    List {getSortIcon('listPrice')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('actualMarginPercent')}>
                                <div className="flex items-center justify-end gap-2">
                                    Margin {getSortIcon('actualMarginPercent')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('stockCount')}>
                                <div className="flex items-center justify-center gap-2">
                                    Stock {getSortIcon('stockCount')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredAndSortedParts.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="px-4 py-8 text-center text-slate-400">
                                    {searchTerm ? 'No parts match your search' : 'No parts in catalog. Add your first part to get started.'}
                                </td>
                            </tr>
                        ) : (
                            filteredAndSortedParts.map(part => (
                                <tr
                                    key={part.id}
                                    className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                                    onClick={() => setViewingPart(part)}
                                >
                                    <td className="px-4 py-3 font-mono text-xs text-cyan-400">{part.sku}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {part.isSerialized && (
                                                <Icons.Barcode size={16} className="text-purple-400" title="Serialized Part" />
                                            )}
                                            <span className="text-white font-medium">{part.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-500/30">
                                            {getCategoryName(part.categoryId) || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        {part.subcategoryId ? (
                                            <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-300 rounded border border-purple-500/30">
                                                {getCategoryName(part.subcategoryId)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                        {part.suppliers?.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {part.suppliers.slice(0, 2).map((s, i) => (
                                                    <span key={i} className="text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                                        {s}
                                                    </span>
                                                ))}
                                                {part.suppliers.length > 2 && (
                                                    <span className="text-xs text-slate-500 px-1">+ {part.suppliers.length - 2}</span>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-slate-300">
                                                {part.activeCost === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(part.activeCost)}
                                            </span>
                                            {part.costPriceSource === 'SUPPLIER_LOWEST' && lowestPrices[part.id] ? (
                                                <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" title="Using lowest supplier price">
                                                    Auto
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Manual cost entry">
                                                    Manual
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-medium">
                                        {part.listPrice === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(part.listPrice)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {part.listPrice > 0 ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`font-bold ${getMarginColor(part.actualMarginPercent, part.targetMarginPercent)}`}>
                                                    {part.actualMarginPercent.toFixed(1)}%
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    (Target: {part.targetMarginPercent}%)
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 text-xs">--</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {part.trackStock ? (
                                            <span className={`font-medium ${part.stockCount <= part.reorderLevel
                                                    ? 'text-red-400'
                                                    : part.stockCount <= part.reorderLevel * 1.5
                                                        ? 'text-amber-400'
                                                        : 'text-emerald-400'
                                                }`}>
                                                {part.stockCount || 0}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 text-xs">-</span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditPart(part);
                                                }}
                                                className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                                title="Edit Part"
                                            >
                                                <Icons.Edit size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setViewingPart({ ...part, confirmDelete: true });
                                                }}
                                                className="p-1.5 rounded hover:bg-slate-600 text-red-400 transition-colors"
                                                title="Delete Part"
                                            >
                                                <Icons.Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Part Details Modal or Delete Confirmation */}
            {viewingPart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    {viewingPart.confirmDelete ? (
                        /* Delete Confirmation Dialog */
                        <div className="bg-slate-900 w-full max-w-md rounded-xl border border-red-500/30 shadow-2xl">
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <Icons.AlertTriangle className="w-6 h-6 text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-2">Delete Part?</h3>
                                        <p className="text-slate-300 text-sm mb-1">
                                            Are you sure you want to delete <strong>{viewingPart.name}</strong>?
                                        </p>
                                        <p className="text-slate-400 text-xs font-mono">SKU: {viewingPart.sku}</p>
                                        <p className="text-red-400 text-sm mt-3">This action cannot be undone.</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setViewingPart(null)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await deletePart(viewingPart.id);
                                                setViewingPart(null);
                                            } catch (error) {
                                                console.error('Error deleting part:', error);
                                                alert('Failed to delete part. Please try again.');
                                            }
                                        }}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Delete Part
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Part Details Modal */
                        <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{viewingPart.name}</h2>
                                    <p className="text-sm text-slate-400 font-mono mt-1">{viewingPart.sku}</p>
                                </div>
                                <button
                                    onClick={() => setViewingPart(null)}
                                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <Icons.X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Details */}
                            <div className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                                        <p className="text-white">{getCategoryName(viewingPart.categoryId)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Subcategory</label>
                                        <p className="text-white">{getCategoryName(viewingPart.subcategoryId) || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${viewingPart.isSerialized
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'bg-slate-700 text-slate-300'
                                            }`}>
                                            {viewingPart.isSerialized ? 'Serialized' : 'Consumable'}
                                        </span>
                                    </div>
                                    {viewingPart.suppliers && viewingPart.suppliers.length > 0 && (
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Suppliers</label>
                                            <div className="flex flex-wrap gap-2">
                                                {viewingPart.suppliers.map((supplier, index) => (
                                                    <span key={index} className="inline-flex px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded border border-emerald-500/30">
                                                        {supplier}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {viewingPart.description && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                                        <p className="text-slate-300">{viewingPart.description}</p>
                                    </div>
                                )}

                                {/* Pricing */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">
                                            Cost Price
                                            {viewingPart.costPriceSource === 'SUPPLIER_LOWEST' && (
                                                <span className="ml-2 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    Auto
                                                </span>
                                            )}
                                        </label>
                                        <p className="text-xl font-bold text-white">
                                            {viewingPart.activeCost === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(viewingPart.activeCost)}
                                        </p>
                                        {viewingPart.costPriceSource === 'SUPPLIER_LOWEST' && lowestPrices[viewingPart.id] && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Manual: {formatCurrency(viewingPart.costPrice)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">List Price</label>
                                        <p className="text-xl font-bold text-white">
                                            {viewingPart.listPrice === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(viewingPart.listPrice)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Margin</label>
                                        <p className="text-xl font-bold">
                                            {viewingPart.listPrice > 0 ? (
                                                <span className={getMarginColor(viewingPart.actualMarginPercent, viewingPart.targetMarginPercent)}>
                                                    {viewingPart.actualMarginPercent.toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">--</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Target: {viewingPart.targetMarginPercent}%</p>
                                    </div>
                                </div>

                                {/* Inventory */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Reorder Level</label>
                                        <p className="text-lg font-semibold text-white">{viewingPart.reorderLevel}</p>
                                    </div>
                                    {viewingPart.isSaleable !== undefined && (
                                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Saleable</label>
                                            <p className="text-lg font-semibold">
                                                {viewingPart.isSaleable ? (
                                                    <span className="text-emerald-400">✓ Yes</span>
                                                ) : (
                                                    <span className="text-slate-500">✗ No</span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                    <button
                                        onClick={() => setViewingPart(null)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            onEditPart(viewingPart);
                                            setViewingPart(null);
                                        }}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Edit Part
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
