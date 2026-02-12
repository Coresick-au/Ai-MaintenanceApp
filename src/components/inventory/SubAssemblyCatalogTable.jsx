import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { deleteSubAssembly } from '../../services/subAssemblyService';
import { getSubAssemblyCostAtDate } from '../../services/costingService';
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
 * Sub Assembly Catalog Table component
 * @description Displays all sub assemblies in a searchable, filterable table with
 * actions for editing, deleting, and viewing BOM details.
 * @param {Object} props - Component props
 * @param {Function} props.onAddSubAssembly - Callback to open add sub assembly modal
 * @param {Function} props.onEditSubAssembly - Callback to edit a sub assembly
 * @returns {JSX.Element} Rendered sub assembly catalog table
 */
export const SubAssemblyCatalogTable = ({ onAddSubAssembly, onEditSubAssembly, refreshTrigger = 0 }) => {
    const [subAssemblies, setSubAssemblies] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [manufacturingCosts, setManufacturingCosts] = useState({});
    const [partCatalogVersion, setPartCatalogVersion] = useState(0);
    const [fastenerCatalogVersion, setFastenerCatalogVersion] = useState(0);
    const [subAssemblyCatalogVersion, setSubAssemblyCatalogVersion] = useState(0);
    const [labourRateVersion, setLabourRateVersion] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [categoryFilters, setCategoryFilters] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'asc' });
    const { categories } = useCategories();
    const tableRef = useRef(null);

    // Resizable columns
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([120, 250, 150, 150, 120, 120, 100, 80, 100]);

    // Load sub assemblies from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sub_assemblies'), (snap) => {
            const subAssembliesList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            subAssembliesList.sort((a, b) => a.name.localeCompare(b.name));
            setSubAssemblies(subAssembliesList);
            setLoading(false);
            setSubAssemblyCatalogVersion(prev => prev + 1);
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

    // Load manufacturing costs for all sub assemblies
    useEffect(() => {
        const loadCosts = async () => {
            const costs = {};
            for (const subAssembly of subAssemblies) {
                try {
                    const cost = await getSubAssemblyCostAtDate(subAssembly.id, new Date());
                    costs[subAssembly.id] = cost;
                } catch (error) {
                    console.error(`Error calculating cost for ${subAssembly.id}:`, error);
                    costs[subAssembly.id] = 0;
                }
            }
            setManufacturingCosts(costs);
        };

        if (subAssemblies.length > 0) {
            loadCosts();
        }
    }, [subAssemblies, refreshTrigger, partCatalogVersion, fastenerCatalogVersion, subAssemblyCatalogVersion, labourRateVersion]);

    const handleDelete = async (subAssembly) => {
        if (!confirm(`Delete sub assembly "${subAssembly.name}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteSubAssembly(subAssembly.id);
        } catch (error) {
            alert(`Failed to delete sub assembly: ${error.message}`);
        }
    };

    // Help to get category name by ID
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

    // Enhance sub assemblies with actual stock counts and calculated values
    const processedSubAssemblies = subAssemblies.map(subAssembly => {
        // Calculate actual stock count from inventory_state
        const actualStockCount = inventory
            .filter(inv => inv.partId === subAssembly.id)
            .reduce((total, inv) => total + (inv.quantity || 0), 0);

        // Calculate Manufacturing Cost
        const mfgCost = subAssembly.costType === 'MANUAL'
            ? (subAssembly.manualCost || 0)
            : (manufacturingCosts[subAssembly.id] || 0);

        // Calculate List Price
        let listPrice;
        if (subAssembly.listPriceSource === 'CALCULATED') {
            const marginPercent = (subAssembly.targetMarginPercent || 0) / 100;
            if (marginPercent >= 1 || mfgCost === 0) {
                listPrice = 0;
            } else {
                listPrice = Math.round(mfgCost / (1 - marginPercent));
            }
        } else {
            listPrice = subAssembly.listPrice || 0;
        }

        // Calculate Margin
        let actualMargin = 0;
        if (listPrice > 0) {
            actualMargin = ((listPrice - mfgCost) / listPrice) * 100;
        }

        return {
            ...subAssembly,
            actualStockCount,
            mfgCost,
            finalListPrice: listPrice,
            actualMargin,
            categoryName: getCategoryName(subAssembly.categoryId),
            subcategoryName: getCategoryName(subAssembly.subcategoryId)
        };
    });

    // Filter sub assemblies based on search term and category filters (now using processed data)
    let filteredSubAssemblies = processedSubAssemblies.filter(subAssembly => {
        const searchLower = searchTerm.toLowerCase();
        const categoryName = (subAssembly.categoryName || '').toLowerCase();
        const subcategoryName = (subAssembly.subcategoryName || '').toLowerCase();
        const legacyCategory = (subAssembly.category || '').toLowerCase();

        return subAssembly.name.toLowerCase().includes(searchLower) ||
            subAssembly.sku.toLowerCase().includes(searchLower) ||
            categoryName.includes(searchLower) ||
            subcategoryName.includes(searchLower) ||
            legacyCategory.includes(searchLower);
    });

    // Apply category filters
    if (categoryFilters.length > 0) {
        filteredSubAssemblies = filteredSubAssemblies.filter(subAssembly => {
            if (!subAssembly.categoryId && !subAssembly.subcategoryId) return false;
            return categoryFilters.some(filterId =>
                filterId === subAssembly.categoryId || filterId === subAssembly.subcategoryId
            );
        });
    }

    // Sort filtered sub assemblies
    filteredSubAssemblies.sort((a, b) => {
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
                        <h2 className="text-xl font-bold text-white">Sub Assembly Catalog</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {categoryFilters.length > 0
                                ? `Showing ${filteredSubAssemblies.length} of ${subAssemblies.length} sub assemblies (filtered)`
                                : `${filteredSubAssemblies.length} sub assembl${filteredSubAssemblies.length !== 1 ? 'ies' : 'y'}`
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
                            onClick={onAddSubAssembly}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                        >
                            <Icons.Plus size={18} />
                            Add Sub Assembly
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
                        placeholder="Search sub assemblies by name, SKU, or category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

                {/* Table */}
                {filteredSubAssemblies.length > 0 ? (
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
                                    {filteredSubAssemblies.map(subAssembly => (
                                        <tr key={subAssembly.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-cyan-400">
                                                {subAssembly.sku}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-white">
                                                    {subAssembly.name}
                                                </div>
                                                {subAssembly.description && (
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {subAssembly.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-slate-300">
                                                {subAssembly.functionalCategory ? (
                                                    <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600">
                                                        {subAssembly.functionalCategory}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-slate-300">
                                                {subAssembly.componentCategory ? (
                                                    <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-300 rounded border border-blue-500/30">
                                                        {subAssembly.componentCategory}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="font-medium text-slate-200">
                                                        {subAssembly.mfgCost > 0 ? formatCurrency(subAssembly.mfgCost) : <span className="text-slate-500">--</span>}
                                                    </span>
                                                    {subAssembly.costType === 'MANUAL' && (
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
                                                        {subAssembly.finalListPrice > 0 ? formatCurrency(subAssembly.finalListPrice) : <span className="text-slate-500">--</span>}
                                                    </span>
                                                    {subAssembly.listPriceSource === 'CALCULATED' && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-medium rounded border border-cyan-500/30" title="Auto-calculated from BOM cost + margin">
                                                            <Icons.Calculator size={12} />
                                                            Auto
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {(() => {
                                                    const { finalListPrice, mfgCost, actualMargin, targetMarginPercent } = subAssembly;

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
                                                {subAssembly.trackStock ? (
                                                    <span className={`font-medium ${subAssembly.actualStockCount <= subAssembly.reorderLevel
                                                        ? 'text-red-400'
                                                        : subAssembly.actualStockCount <= subAssembly.reorderLevel * 1.5
                                                            ? 'text-amber-400'
                                                            : 'text-emerald-400'
                                                        }`}>
                                                        {subAssembly.actualStockCount || 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => onEditSubAssembly(subAssembly)}
                                                        className="p-2 hover:bg-slate-600 text-blue-400 rounded transition-colors"
                                                        title="Edit sub assembly"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(subAssembly)}
                                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                                        title="Delete sub assembly"
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
                        <p className="text-lg font-medium mb-2">No sub assemblies found</p>
                        <p className="text-sm">
                            {searchTerm ? 'Try a different search term' : 'Click "Add Sub Assembly" to create your first sub assembly'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
