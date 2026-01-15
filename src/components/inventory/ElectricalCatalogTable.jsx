import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { getLowestSupplierPrice, getCurrentPriceForSupplier } from '../../services/partPricingService';
import { formatCurrency } from '../../utils/helpers';
import { deleteElectricalItem } from '../../services/inventoryService';
import { getAllPricing } from '../../services/partPricingService';
import { exportToCSV } from '../../utils/csvExportImport';
import { FilterPanel } from './categories/FilterPanel';
import { useCategories } from '../../context/CategoryContext';
import { useResizableColumns } from '../../hooks/useResizableColumns';

export const ElectricalCatalogTable = ({ onAddElectrical, onEditElectrical }) => {
    const [electricalItems, setElectricalItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'ascending' });
    const [loading, setLoading] = useState(true);
    const [viewingItem, setViewingItem] = useState(null);
    const [lowestPrices, setLowestPrices] = useState({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [categoryFilters, setCategoryFilters] = useState([]);
    const { categories } = useCategories();
    const tableRef = useRef(null);

    // Resizable columns - initial widths auto-sized to content
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([150, 250, 150, 150, 130, 150, 110, 100, 100, 130, 80, 100]);

    // Real-time listener for electrical catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'electrical_catalog'),
            (snapshot) => {
                const itemsList = snapshot.docs.map(doc => doc.data());
                setElectricalItems(itemsList);
                setLoading(false);
            },
            (error) => {
                console.error('[ElectricalCatalog] Error fetching items:', error);
                setLoading(false);
            }
        );

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
                console.error('[ElectricalCatalog] Error fetching inventory:', error);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load lowest supplier prices for all items
    useEffect(() => {
        const loadLowestPrices = async () => {
            const prices = {};
            for (const item of electricalItems) {
                if (item.id && item.costPriceSource === 'SUPPLIER_LOWEST') {
                    try {
                        const validSuppliers = item.suppliers || [];
                        const lowest = await getLowestSupplierPrice(item.id, new Date(), validSuppliers);
                        if (lowest) {
                            prices[item.id] = {
                                price: lowest.costPrice,
                                date: lowest.effectiveDate
                            };
                        }
                    } catch (err) {
                        console.error(`Error loading lowest price for ${item.id}:`, err);
                    }
                } else if (item.id && item.costPriceSource === 'PREFERRED_SUPPLIER' && item.preferredSupplier) {
                    try {
                        const preferredPrice = await getCurrentPriceForSupplier(item.id, item.preferredSupplier, new Date());
                        if (preferredPrice) {
                            prices[item.id] = {
                                price: preferredPrice.costPrice,
                                date: preferredPrice.effectiveDate
                            };
                        }
                    } catch (err) {
                        console.error(`Error loading preferred supplier price for ${item.id}:`, err);
                    }
                }
            }
            setLowestPrices(prices);
        };

        if (electricalItems.length > 0) {
            loadLowestPrices();
        }
    }, [electricalItems]);

    // Calculate actual margin and stock for each item
    const itemsWithMargins = useMemo(() => {
        return electricalItems.map(item => {
            // Determine active cost and date based on source
            let activeCost = item.costPrice;
            let costDate = item.updatedAt; // Default to update time for manual

            if ((item.costPriceSource === 'SUPPLIER_LOWEST' || item.costPriceSource === 'PREFERRED_SUPPLIER') && lowestPrices[item.id]) {
                activeCost = lowestPrices[item.id].price;
                costDate = lowestPrices[item.id].date;
            }

            const actualMargin = item.listPrice > 0
                ? ((item.listPrice - activeCost) / item.listPrice) * 100
                : 0;

            // Calculate actual stock count from inventory_state
            const actualStockCount = inventory
                .filter(inv => inv.partId === item.id)
                .reduce((total, inv) => total + (inv.quantity || 0), 0);

            return {
                ...item,
                activeCost,
                costDate, // Expose for table
                actualMarginPercent: actualMargin,
                actualStockCount
            };
        });
    }, [electricalItems, lowestPrices, inventory]);

    // Helper to get category name by ID
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : '';
    };

    // Filter and sort
    const filteredAndSortedItems = useMemo(() => {
        let filtered = itemsWithMargins.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const categoryName = getCategoryName(item.categoryId)?.toLowerCase() || '';

            // Check all subcategories for search term
            const subcategoryIds = item.subcategoryIds || (item.subcategoryId ? [item.subcategoryId] : []);
            const subcategoryNames = subcategoryIds
                .map(id => getCategoryName(id)?.toLowerCase() || '')
                .join(' ');

            return item.name.toLowerCase().includes(searchLower) ||
                item.sku.toLowerCase().includes(searchLower) ||
                categoryName.includes(searchLower) ||
                subcategoryNames.includes(searchLower);
        });

        // Apply category filters
        if (categoryFilters.length > 0) {
            filtered = filtered.filter(item => {
                const subcategoryIds = item.subcategoryIds || (item.subcategoryId ? [item.subcategoryId] : []);
                if (!item.categoryId && subcategoryIds.length === 0) return false;

                return categoryFilters.some(filterId =>
                    filterId === item.categoryId || subcategoryIds.includes(filterId)
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
                // Use first subcategory for sorting
                const aSubIds = a.subcategoryIds || (a.subcategoryId ? [a.subcategoryId] : []);
                const bSubIds = b.subcategoryIds || (b.subcategoryId ? [b.subcategoryId] : []);
                aVal = aSubIds.length > 0 ? getCategoryName(aSubIds[0]) || '' : '';
                bVal = bSubIds.length > 0 ? getCategoryName(bSubIds[0]) || '' : '';
            } else if (sortConfig.key === 'suppliers') {
                // Sort by first supplier
                aVal = a.suppliers && a.suppliers.length > 0 ? a.suppliers[0] : '';
                bVal = b.suppliers && b.suppliers.length > 0 ? b.suppliers[0] : '';
            } else if (sortConfig.key === 'costDate') {
                // Handle date sorting (could be string or Date object)
                aVal = a.costDate ? new Date(a.costDate).getTime() : 0;
                bVal = b.costDate ? new Date(b.costDate).getTime() : 0;
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
    }, [itemsWithMargins, searchTerm, sortConfig, categoryFilters, categories]);

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

    const handleExportCatalog = () => {
        try {
            const dataToExport = filteredAndSortedItems.map(item => ({
                SKU: item.sku,
                Name: item.name,
                Category: getCategoryName(item.categoryId),
                Subcategories: (item.subcategoryIds || (item.subcategoryId ? [item.subcategoryId] : []))
                    .map(id => getCategoryName(id))
                    .join('; '),
                Material: item.material || '',
                Description: item.description || '',
                Suppliers: (item.suppliers || []).join('; '),
                'Supplier SKUs': Object.entries(item.supplierSKUs || {})
                    .map(([supplier, sku]) => `${supplier}: ${sku}`)
                    .join('; '),
                'Cost Price': (item.activeCost / 100).toFixed(2),
                'List Price': (item.listPrice / 100).toFixed(2),
                'Margin %': item.actualMarginPercent.toFixed(1),
                'Stock Count': item.actualStockCount || 0,
                'Reorder Level': item.reorderLevel || 0,
                'Location ID': item.locationId || ''
            }));

            const timestamp = new Date().toISOString().split('T')[0];
            exportToCSV(dataToExport, `Electrical_Catalog_Export_${timestamp}.csv`);
        } catch (error) {
            console.error('Error exporting catalog:', error);
            alert('Failed to export catalog');
        }
    };

    const handleExportCosts = async () => {
        try {
            // Get all pricing data
            const allPricing = await getAllPricing();

            // Filter to include only items currently in view
            const visibleIds = new Set(filteredAndSortedItems.map(i => i.id));

            const dataToExport = allPricing
                .filter(price => visibleIds.has(price.partId))
                .map(price => {
                    const item = electricalItems.find(i => i.id === price.partId);
                    return {
                        'Part SKU': item ? item.sku : 'Unknown',
                        'Part Name': item ? item.name : 'Unknown',
                        'Supplier': price.supplierName,
                        'Effective Date': price.effectiveDate ? new Date(price.effectiveDate).toLocaleDateString() : '',
                        'Cost Price': (price.costPrice / 100).toFixed(2),
                        'Quantity': price.quantity || 1,
                        'Unit Cost': (price.costPrice / 100).toFixed(2),
                        'Total Cost': ((price.costPrice * (price.quantity || 1)) / 100).toFixed(2),
                        'Notes': price.notes || ''
                    };
                });

            const timestamp = new Date().toISOString().split('T')[0];
            exportToCSV(dataToExport, `Electrical_Cost_History_${timestamp}.csv`);
        } catch (error) {
            console.error('Error exporting costs:', error);
            alert('Failed to export cost history');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading catalog...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center">
            <div className="w-full max-w-fit">
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
                                ? `Showing ${filteredAndSortedItems.length} of ${itemsWithMargins.length} items (filtered)`
                                : `${filteredAndSortedItems.length} item${filteredAndSortedItems.length !== 1 ? 's' : ''}`
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
                            onClick={onAddElectrical}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                        >
                            <Icons.Plus size={18} />
                            Add Component
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${isExportMenuOpen ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'}`}
                            >
                                <Icons.Download size={18} />
                                Export
                            </button>
                            {isExportMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsExportMenuOpen(false)}
                                    ></div>
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-20">
                                        <button
                                            onClick={() => {
                                                handleExportCatalog();
                                                setIsExportMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                                        >
                                            <Icons.FileText size={16} />
                                            Export Catalog
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleExportCosts();
                                                setIsExportMenuOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 border-t border-slate-700"
                                        >
                                            <Icons.DollarSign size={16} />
                                            Export Cost History
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
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
                    <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                        <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-3 cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('sku')} style={{ width: `${columnWidths[0]}px` }}>
                                    <div className="flex items-center gap-2 column-content">
                                        SKU {getSortIcon('sku')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(0, e)}
                                        onDoubleClick={() => autoFitColumn(0, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('name')} style={{ width: `${columnWidths[1]}px` }}>
                                    <div className="flex items-center gap-2 column-content">
                                        Name {getSortIcon('name')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(1, e)}
                                        onDoubleClick={() => autoFitColumn(1, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('categoryId')} style={{ width: `${columnWidths[2]}px` }}>
                                    <div className="flex items-center gap-2 column-content">
                                        Category {getSortIcon('categoryId')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(2, e)}
                                        onDoubleClick={() => autoFitColumn(2, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('subcategoryId')} style={{ width: `${columnWidths[3]}px` }}>
                                    <div className="flex items-center gap-2 column-content">
                                        Subcategory {getSortIcon('subcategoryId')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(3, e)}
                                        onDoubleClick={() => autoFitColumn(3, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('material')} style={{ width: `${columnWidths[4]}px` }}>
                                    <div className="flex items-center gap-2 column-content">
                                        Material {getSortIcon('material')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(4, e)}
                                        onDoubleClick={() => autoFitColumn(4, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('suppliers')} style={{ width: `${columnWidths[5]}px` }}>
                                    <div className="flex items-center gap-2 column-content">
                                        Suppliers {getSortIcon('suppliers')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(5, e)}
                                        onDoubleClick={() => autoFitColumn(5, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('costPrice')} style={{ width: `${columnWidths[6]}px` }}>
                                    <div className="flex items-center justify-end gap-2 column-content">
                                        Cost {getSortIcon('costPrice')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(6, e)}
                                        onDoubleClick={() => autoFitColumn(6, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('costDate')} style={{ width: `${columnWidths[7]}px` }}>
                                    <div className="flex items-center justify-end gap-2 column-content">
                                        Cost Date {getSortIcon('costDate')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(7, e)}
                                        onDoubleClick={() => autoFitColumn(7, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('listPrice')} style={{ width: `${columnWidths[8]}px` }}>
                                    <div className="flex items-center justify-end gap-2 column-content">
                                        List {getSortIcon('listPrice')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(8, e)}
                                        onDoubleClick={() => autoFitColumn(8, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('actualMarginPercent')} style={{ width: `${columnWidths[9]}px` }}>
                                    <div className="flex items-center justify-end gap-2 column-content">
                                        Margin {getSortIcon('actualMarginPercent')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(9, e)}
                                        onDoubleClick={() => autoFitColumn(9, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 text-center cursor-pointer hover:bg-slate-800 transition-colors relative" onClick={() => handleSort('stockCount')} style={{ width: `${columnWidths[10]}px` }}>
                                    <div className="flex items-center justify-center gap-2 column-content">
                                        Stock {getSortIcon('stockCount')}
                                    </div>
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                                        onMouseDown={(e) => handleResizeStart(10, e)}
                                        onDoubleClick={() => autoFitColumn(10, tableRef)}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Drag to resize, double-click to auto-fit"
                                    />
                                </th>
                                <th className="px-3 py-3 text-center relative" style={{ width: `${columnWidths[11]}px` }}>
                                    <div className="column-content">Actions</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredAndSortedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="px-4 py-8 text-center text-slate-400">
                                        {searchTerm ? 'No electrical items match your search' : 'No electrical items in catalog. Add your first item to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedItems.map(item => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                                        onClick={() => setViewingItem(item)}
                                    >
                                        <td className="px-4 py-3 font-mono text-xs text-cyan-400">{item.sku}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {item.isSerialized && (
                                                    <Icons.Barcode size={16} className="text-purple-400" title="Serialized Item" />
                                                )}
                                                <span className="text-white font-medium">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-300 rounded border border-cyan-500/30">
                                                {getCategoryName(item.categoryId) || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {(() => {
                                                const subcategoryIds = item.subcategoryIds || (item.subcategoryId ? [item.subcategoryId] : []);
                                                if (subcategoryIds.length === 0) {
                                                    return <span className="text-slate-500">-</span>;
                                                }
                                                return (
                                                    <div className="flex flex-wrap gap-1">
                                                        {subcategoryIds.map(subId => (
                                                            <span key={subId} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-300 rounded border border-purple-500/30">
                                                                {getCategoryName(subId)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-3 py-3 text-slate-300">
                                            {item.material ? (
                                                <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-300 rounded border border-amber-500/30 whitespace-nowrap">
                                                    {item.material}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">
                                            {item.suppliers?.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.suppliers.slice(0, 2).map((s, i) => (
                                                        <span key={i} className="text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                                            {s}
                                                        </span>
                                                    ))}
                                                    {item.suppliers.length > 2 && (
                                                        <span className="text-xs text-slate-500 px-1">+ {item.suppliers.length - 2}</span>
                                                    )}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-slate-300">
                                                    {item.activeCost === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(item.activeCost)}
                                                </span>
                                                {item.costPriceSource === 'SUPPLIER_LOWEST' && lowestPrices[item.id] ? (
                                                    <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" title="Using lowest supplier price">
                                                        Auto
                                                    </span>
                                                ) : item.costPriceSource === 'PREFERRED_SUPPLIER' ? (
                                                    <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Using preferred supplier price">
                                                        Preferred
                                                    </span>
                                                ) : item.costPriceSource === 'SELECTED_ENTRY' ? (
                                                    <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" title="Using specific selected price">
                                                        Selected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Manual cost entry">
                                                        Manual
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                            {item.costDate ? new Date(item.costDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-white font-medium">
                                            {item.listPrice === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(item.listPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {item.listPrice > 0 ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`font-bold ${getMarginColor(item.actualMarginPercent, item.targetMarginPercent)}`}>
                                                        {item.actualMarginPercent.toFixed(1)}%
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        (Target: {item.targetMarginPercent}%)
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 text-xs">--</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {item.trackStock ? (
                                                <span className={`font-medium ${item.actualStockCount <= item.reorderLevel
                                                    ? 'text-red-400'
                                                    : item.actualStockCount <= item.reorderLevel * 1.5
                                                        ? 'text-amber-400'
                                                        : 'text-emerald-400'
                                                    }`}>
                                                    {item.actualStockCount || 0}
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
                                                        onEditElectrical(item);
                                                    }}
                                                    className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                                    title="Edit Item"
                                                >
                                                    <Icons.Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingItem({ ...item, confirmDelete: true });
                                                    }}
                                                    className="p-1.5 rounded hover:bg-slate-600 text-red-400 transition-colors"
                                                    title="Delete Item"
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

                {/* Item Details Modal or Delete Confirmation */}
                {viewingItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        {viewingItem.confirmDelete ? (
                            /* Delete Confirmation Dialog */
                            <div className="bg-slate-900 w-full max-w-md rounded-xl border border-red-500/30 shadow-2xl">
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <Icons.AlertTriangle className="w-6 h-6 text-red-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white mb-2">Delete Electrical Item?</h3>
                                            <p className="text-slate-300 text-sm mb-1">
                                                Are you sure you want to delete <strong>{viewingItem.name}</strong>?
                                            </p>
                                            <p className="text-slate-400 text-xs font-mono">SKU: {viewingItem.sku}</p>
                                            <p className="text-red-400 text-sm mt-3">This action cannot be undone.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setViewingItem(null)}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await deleteElectricalItem(viewingItem.id);
                                                    setViewingItem(null);
                                                } catch (error) {
                                                    console.error('Error deleting electrical item:', error);
                                                    alert(error.message || 'Failed to delete item. Please try again.');
                                                }
                                            }}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Delete Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Item Details Modal */
                            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{viewingItem.name}</h2>
                                        <p className="text-sm text-slate-400 font-mono mt-1">{viewingItem.sku}</p>
                                    </div>
                                    <button
                                        onClick={() => setViewingItem(null)}
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
                                            <p className="text-white">{getCategoryName(viewingItem.categoryId)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Subcategories</label>
                                            {(() => {
                                                const subcategoryIds = viewingItem.subcategoryIds || (viewingItem.subcategoryId ? [viewingItem.subcategoryId] : []);
                                                if (subcategoryIds.length === 0) {
                                                    return <p className="text-white">-</p>;
                                                }
                                                return (
                                                    <div className="flex flex-wrap gap-2">
                                                        {subcategoryIds.map(subId => (
                                                            <span key={subId} className="text-xs px-2 py-1 bg-purple-500/10 text-purple-300 rounded border border-purple-500/30">
                                                                {getCategoryName(subId)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {viewingItem.material && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Material</label>
                                                <p className="text-white">{viewingItem.material}</p>
                                            </div>
                                        )}
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${viewingItem.isSerialized
                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                : 'bg-slate-700 text-slate-300'
                                                }`}>
                                                {viewingItem.isSerialized ? 'Serialized' : 'Consumable'}
                                            </span>
                                        </div>
                                        {viewingItem.suppliers && viewingItem.suppliers.length > 0 && (
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Suppliers</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {viewingItem.suppliers.map((supplier, index) => (
                                                        <span key={index} className="inline-flex px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded border border-emerald-500/30">
                                                            {supplier}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {viewingItem.description && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                                            <p className="text-slate-300">{viewingItem.description}</p>
                                        </div>
                                    )}

                                    {/* Pricing */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                                Cost Price
                                                {viewingItem.costPriceSource === 'SUPPLIER_LOWEST' && (
                                                    <span className="ml-2 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        Auto
                                                    </span>
                                                )}
                                                {viewingItem.costPriceSource === 'PREFERRED_SUPPLIER' && (
                                                    <span className="ml-2 inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                        Preferred
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xl font-bold text-white">
                                                {viewingItem.activeCost === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(viewingItem.activeCost)}
                                            </p>
                                            {viewingItem.costPriceSource === 'SUPPLIER_LOWEST' && lowestPrices[viewingItem.id] && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Manual: {formatCurrency(viewingItem.costPrice)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">List Price</label>
                                            <p className="text-xl font-bold text-white">
                                                {viewingItem.listPrice === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(viewingItem.listPrice)}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Margin</label>
                                            <p className="text-xl font-bold">
                                                {viewingItem.listPrice > 0 ? (
                                                    <span className={getMarginColor(viewingItem.actualMarginPercent, viewingItem.targetMarginPercent)}>
                                                        {viewingItem.actualMarginPercent.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">--</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">Target: {viewingItem.targetMarginPercent}%</p>
                                        </div>
                                    </div>

                                    {/* Inventory */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Reorder Level</label>
                                            <p className="text-lg font-semibold text-white">{viewingItem.reorderLevel}</p>
                                        </div>
                                        {viewingItem.isSaleable !== undefined && (
                                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Saleable</label>
                                                <p className="text-lg font-semibold">
                                                    {viewingItem.isSaleable ? (
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
                                            onClick={() => setViewingItem(null)}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => {
                                                onEditElectrical(viewingItem);
                                                setViewingItem(null);
                                            }}
                                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Edit Item
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
