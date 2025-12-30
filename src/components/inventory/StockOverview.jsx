import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { adjustStockQuantity } from '../../services/inventoryService';

export const StockOverview = ({ onAdjustStock }) => {
    const [subView, setSubView] = useState('overview'); // 'overview' or 'stocktake'

    // Stock Overview state
    const [parts, setParts] = useState([]);
    const [fasteners, setFasteners] = useState([]);
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [serializedAssets, setSerializedAssets] = useState([]);
    const [locations, setLocations] = useState([]);
    const [expandedPartId, setExpandedPartId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sorting and filtering state
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [typeFilters, setTypeFilters] = useState({ part: true, fastener: true, product: true });
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'low', 'out', 'ok'

    // Stock Take state
    const [selectedLocation, setSelectedLocation] = useState('');
    const [counts, setCounts] = useState({});
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStocktakeTab, setActiveStocktakeTab] = useState('parts');

    // Real-time listeners
    useEffect(() => {
        const unsubParts = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            setParts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubFasteners = onSnapshot(collection(db, 'fastener_catalog'), (snap) => {
            setFasteners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
            setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubInventory = onSnapshot(collection(db, 'inventory_state'), (snap) => {
            setInventory(snap.docs.map(doc => doc.data()));
        });

        const unsubAssets = onSnapshot(collection(db, 'serialized_assets'), (snap) => {
            setSerializedAssets(snap.docs.map(doc => doc.data()));
        });

        const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
            const locationsList = snap.docs.map(doc => doc.data());
            setLocations(locationsList);
            if (locationsList.length > 0 && !selectedLocation) {
                setSelectedLocation(locationsList[0].id);
            }
            setLoading(false);
        });

        return () => {
            unsubParts();
            unsubFasteners();
            unsubProducts();
            unsubInventory();
            unsubAssets();
            unsubLocations();
        };
    }, []);

    // Aggregate stock data for overview - include parts, fasteners, and products
    const stockOverview = useMemo(() => {
        const allItems = [];

        // Add parts
        parts.forEach(part => {
            let totalQuantity = 0;
            const locationBreakdown = [];

            if (part.isSerialized) {
                const assetsByLocation = {};
                serializedAssets
                    .filter(asset => asset.partId === part.id && asset.status === 'IN_STOCK')
                    .forEach(asset => {
                        assetsByLocation[asset.currentLocationId] = (assetsByLocation[asset.currentLocationId] || 0) + 1;
                    });

                Object.entries(assetsByLocation).forEach(([locationId, count]) => {
                    const location = locations.find(l => l.id === locationId);
                    locationBreakdown.push({
                        locationId,
                        locationName: location?.name || 'Unknown',
                        quantity: count
                    });
                    totalQuantity += count;
                });
            } else {
                inventory
                    .filter(inv => inv.partId === part.id)
                    .forEach(inv => {
                        const location = locations.find(l => l.id === inv.locationId);
                        locationBreakdown.push({
                            locationId: inv.locationId,
                            locationName: location?.name || 'Unknown',
                            quantity: inv.quantity
                        });
                        totalQuantity += inv.quantity;
                    });
            }

            const isLowStock = totalQuantity < part.reorderLevel;
            const isAtReorderLevel = totalQuantity === part.reorderLevel;

            allItems.push({
                item: part,
                itemType: 'part',
                totalQuantity,
                locationBreakdown,
                serializedAssets: part.isSerialized
                    ? serializedAssets.filter(a => a.partId === part.id && a.status === 'IN_STOCK')
                    : [],
                isLowStock,
                isAtReorderLevel
            });
        });

        // Add fasteners (only those with trackStock enabled)
        fasteners.filter(f => f.trackStock).forEach(fastener => {
            let totalQuantity = 0;
            const locationBreakdown = [];

            inventory
                .filter(inv => inv.partId === fastener.id)
                .forEach(inv => {
                    const location = locations.find(l => l.id === inv.locationId);
                    locationBreakdown.push({
                        locationId: inv.locationId,
                        locationName: location?.name || 'Unknown',
                        quantity: inv.quantity
                    });
                    totalQuantity += inv.quantity;
                });

            const isLowStock = totalQuantity < (fastener.reorderLevel || 0);
            const isAtReorderLevel = totalQuantity === (fastener.reorderLevel || 0);

            allItems.push({
                item: fastener,
                itemType: 'fastener',
                totalQuantity,
                locationBreakdown,
                serializedAssets: [],
                isLowStock,
                isAtReorderLevel
            });
        });

        // Add products (only those with trackStock enabled)
        products.filter(p => p.trackStock).forEach(product => {
            let totalQuantity = 0;
            const locationBreakdown = [];

            inventory
                .filter(inv => inv.partId === product.id)
                .forEach(inv => {
                    const location = locations.find(l => l.id === inv.locationId);
                    locationBreakdown.push({
                        locationId: inv.locationId,
                        locationName: location?.name || 'Unknown',
                        quantity: inv.quantity
                    });
                    totalQuantity += inv.quantity;
                });

            const isLowStock = totalQuantity < (product.reorderLevel || 0);
            const isAtReorderLevel = totalQuantity === (product.reorderLevel || 0);

            allItems.push({
                item: product,
                itemType: 'product',
                totalQuantity,
                locationBreakdown,
                serializedAssets: [],
                isLowStock,
                isAtReorderLevel
            });
        });

        // Sort by name
        return allItems.sort((a, b) => a.item.name.localeCompare(b.item.name));
    }, [parts, fasteners, products, inventory, serializedAssets, locations]);

    // Apply filters and sorting
    const filteredAndSortedOverview = useMemo(() => {
        let filtered = [...stockOverview];

        // Filter by type
        filtered = filtered.filter(item => typeFilters[item.itemType]);

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => {
                if (statusFilter === 'out') return item.totalQuantity === 0;
                if (statusFilter === 'reorder') return item.isAtReorderLevel;
                if (statusFilter === 'low') return item.isLowStock && item.totalQuantity > 0;
                if (statusFilter === 'good') return !item.isLowStock && !item.isAtReorderLevel && item.totalQuantity > 0;
                return true;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'sku':
                    aVal = a.item.sku || '';
                    bVal = b.item.sku || '';
                    break;
                case 'name':
                    aVal = a.item.name || '';
                    bVal = b.item.name || '';
                    break;
                case 'type':
                    aVal = a.itemType || '';
                    bVal = b.itemType || '';
                    break;
                case 'quantity':
                    aVal = a.totalQuantity;
                    bVal = b.totalQuantity;
                    break;
                case 'reorder':
                    aVal = a.item.reorderLevel || 0;
                    bVal = b.item.reorderLevel || 0;
                    break;
                case 'status':
                    // Sort by status: Out of Stock < Low Stock < OK
                    aVal = a.totalQuantity === 0 ? 0 : a.isLowStock ? 1 : 2;
                    bVal = b.totalQuantity === 0 ? 0 : b.isLowStock ? 1 : 2;
                    break;
                default:
                    return 0;
            }

            if (typeof aVal === 'string') {
                const result = aVal.localeCompare(bVal);
                return sortConfig.direction === 'asc' ? result : -result;
            } else {
                const result = aVal - bVal;
                return sortConfig.direction === 'asc' ? result : -result;
            }
        });

        return filtered;
    }, [stockOverview, typeFilters, statusFilter, sortConfig]);

    // Stock Take functions
    const getCurrentStock = (itemId) => {
        if (!selectedLocation) return 0;
        const inv = inventory.find(i => i.partId === itemId && i.locationId === selectedLocation);
        return inv?.quantity || 0;
    };

    const getCountedStock = (itemId) => {
        return counts[itemId] !== undefined ? counts[itemId] : '';
    };

    const getVariance = (itemId) => {
        const counted = counts[itemId];
        if (counted === undefined || counted === '') return null;
        return parseInt(counted) - getCurrentStock(itemId);
    };

    const handleCountChange = (itemId, value) => {
        setCounts(prev => ({
            ...prev,
            [itemId]: value === '' ? '' : parseInt(value) || 0
        }));
    };

    const handleSubmitStockTake = async () => {
        if (!selectedLocation) {
            alert('Please select a location');
            return;
        }

        const updates = Object.entries(counts)
            .filter(([_, count]) => count !== '')
            .map(([itemId, count]) => ({
                itemId,
                variance: parseInt(count) - getCurrentStock(itemId)
            }))
            .filter(u => u.variance !== 0);

        if (updates.length === 0) {
            alert('No changes to save');
            return;
        }

        if (!confirm(`Save ${updates.length} stock adjustment(s)?`)) return;

        setSaving(true);
        try {
            const userId = 'current-user'; // TODO: Get from auth

            for (const update of updates) {
                await adjustStockQuantity(
                    update.itemId,
                    selectedLocation,
                    update.variance,
                    userId,
                    'Stock take adjustment'
                );
            }

            alert('✅ Stock take saved successfully!');
            setCounts({});
        } catch (err) {
            alert('❌ Failed to save stock take: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Sort handler
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getCurrentStocktakeItems = () => {
        switch (activeStocktakeTab) {
            case 'parts':
                return parts.filter(p => !p.isSerialized && p.trackStock);
            case 'fasteners':
                return fasteners.filter(f => f.trackStock);
            case 'products':
                return products.filter(p => p.trackStock);
            default:
                return [];
        }
    };

    const filteredStocktakeItems = getCurrentStocktakeItems().filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with Sub-View Toggle */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Stock Levels</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {subView === 'overview'
                                ? `${stockOverview.filter(s => s.isLowStock).length} part${stockOverview.filter(s => s.isLowStock).length !== 1 ? 's' : ''} below reorder level`
                                : 'Physical inventory count'
                            }
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSubView('overview')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${subView === 'overview'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icons.Database size={18} />
                                Overview
                            </div>
                        </button>
                        <button
                            onClick={() => setSubView('stocktake')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${subView === 'stocktake'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icons.ClipboardList size={18} />
                                Stock Take
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content based on sub-view */}
            {subView === 'overview' ? (
                <div className="flex flex-col flex-1">
                    {/* Filter Controls */}
                    <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                {/* Type Filters */}
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase mb-2 block">Type</span>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={typeFilters.part}
                                                onChange={(e) => setTypeFilters(prev => ({ ...prev, part: e.target.checked }))}
                                                className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                            />
                                            <span className="text-sm text-slate-300">Parts</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={typeFilters.fastener}
                                                onChange={(e) => setTypeFilters(prev => ({ ...prev, fastener: e.target.checked }))}
                                                className="w-4 h-4 rounded border-slate-600 text-amber-600 focus:ring-amber-500 focus:ring-offset-slate-900"
                                            />
                                            <span className="text-sm text-slate-300">Fasteners</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={typeFilters.product}
                                                onChange={(e) => setTypeFilters(prev => ({ ...prev, product: e.target.checked }))}
                                                className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                            />
                                            <span className="text-sm text-slate-300">Products</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase mb-2 block">Status</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="all">All</option>
                                        <option value="out">Out of Stock</option>
                                        <option value="reorder">Reorder</option>
                                        <option value="low">Low Stock</option>
                                        <option value="good">Good</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Active Filters Summary */}
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>
                                Showing {filteredAndSortedOverview.length} of {stockOverview.length} items
                            </span>
                            {(statusFilter !== 'all' || !typeFilters.part || !typeFilters.fastener || !typeFilters.product) && (
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setTypeFilters({ part: true, fastener: true, product: true });
                                    }}
                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 w-8"></th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('sku')}
                                    >
                                        <div className="flex items-center gap-2">
                                            SKU
                                            {sortConfig.key === 'sku' && (
                                                sortConfig.direction === 'asc' ?
                                                    <Icons.ChevronUp size={14} /> :
                                                    <Icons.ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Name
                                            {sortConfig.key === 'name' && (
                                                sortConfig.direction === 'asc' ?
                                                    <Icons.ChevronUp size={14} /> :
                                                    <Icons.ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('type')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Type
                                            {sortConfig.key === 'type' && (
                                                sortConfig.direction === 'asc' ?
                                                    <Icons.ChevronUp size={14} /> :
                                                    <Icons.ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('quantity')}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            Total On Hand
                                            {sortConfig.key === 'quantity' && (
                                                sortConfig.direction === 'asc' ?
                                                    <Icons.ChevronUp size={14} /> :
                                                    <Icons.ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('reorder')}
                                    >
                                        <div className="flex items-center justify-end gap-2">
                                            Reorder Level
                                            {sortConfig.key === 'reorder' && (
                                                sortConfig.direction === 'asc' ?
                                                    <Icons.ChevronUp size={14} /> :
                                                    <Icons.ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-center cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('status')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Status
                                            {sortConfig.key === 'status' && (
                                                sortConfig.direction === 'asc' ?
                                                    <Icons.ChevronUp size={14} /> :
                                                    <Icons.ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredAndSortedOverview.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                                            {stockOverview.length === 0
                                                ? 'No items in catalog. Add items to start tracking stock.'
                                                : 'No items match the current filters.'
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedOverview.map(stockItem => (
                                        <React.Fragment key={stockItem.item.id}>
                                            <tr className="hover:bg-slate-700/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    {stockItem.item.isSerialized && stockItem.serializedAssets.length > 0 && (
                                                        <button
                                                            onClick={() => setExpandedPartId(expandedPartId === stockItem.item.id ? null : stockItem.item.id)}
                                                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                                                        >
                                                            {expandedPartId === stockItem.item.id ? (
                                                                <Icons.ChevronDown size={16} className="text-cyan-400" />
                                                            ) : (
                                                                <Icons.ChevronRight size={16} className="text-slate-400" />
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-cyan-400">{stockItem.item.sku}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {stockItem.item.isSerialized && (
                                                            <Icons.Barcode size={16} className="text-purple-400" />
                                                        )}
                                                        {stockItem.itemType === 'fastener' && (
                                                            <Icons.Wrench size={16} className="text-amber-400" />
                                                        )}
                                                        {stockItem.itemType === 'product' && (
                                                            <Icons.Box size={16} className="text-purple-400" />
                                                        )}
                                                        <span className="text-white font-medium">{stockItem.item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${stockItem.item.isSerialized
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : stockItem.itemType === 'fastener'
                                                            ? 'bg-amber-500/20 text-amber-400'
                                                            : stockItem.itemType === 'product'
                                                                ? 'bg-purple-500/20 text-purple-400'
                                                                : 'bg-slate-700 text-slate-300'
                                                        }`}>
                                                        {stockItem.item.isSerialized
                                                            ? 'Serialized'
                                                            : stockItem.itemType === 'fastener'
                                                                ? 'Fastener'
                                                                : stockItem.itemType === 'product'
                                                                    ? 'Product'
                                                                    : 'Part'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-bold ${stockItem.isLowStock ? 'text-red-400' : 'text-white'}`}>
                                                        {stockItem.totalQuantity === 0 ? 'No Stock' : stockItem.totalQuantity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-300">{stockItem.item.reorderLevel}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {stockItem.totalQuantity === 0 ? (
                                                        <span className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-300 font-medium">
                                                            <Icons.XCircle size={12} />
                                                            No Stock
                                                        </span>
                                                    ) : stockItem.isAtReorderLevel ? (
                                                        <span className="flex items-center justify-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 font-medium">
                                                            <Icons.AlertTriangle size={12} />
                                                            Reorder
                                                        </span>
                                                    ) : stockItem.isLowStock ? (
                                                        <span className="flex items-center justify-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-medium">
                                                            <Icons.AlertTriangle size={12} />
                                                            Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                                                            Good
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => onAdjustStock(stockItem.item)}
                                                        className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                                        title="Adjust Stock"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Row for Serialized Assets */}
                                            {expandedPartId === stockItem.item.id && stockItem.item.isSerialized && (
                                                <tr>
                                                    <td colSpan="8" className="px-4 py-3 bg-slate-900/50">
                                                        <div className="space-y-2">
                                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Serial Numbers:</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {stockItem.serializedAssets.map(asset => {
                                                                    const location = locations.find(l => l.id === asset.currentLocationId);
                                                                    return (
                                                                        <div
                                                                            key={asset.id}
                                                                            className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Icons.Barcode size={14} className="text-purple-400" />
                                                                                <span className="font-mono text-xs text-white">{asset.serialNumber}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                                                <Icons.MapPin size={12} />
                                                                                {location?.name || 'Unknown'}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Stock Take View */
                <div className="flex flex-col flex-1">
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={handleSubmitStockTake}
                                disabled={saving || Object.keys(counts).length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Icons.Save size={18} />
                                {saving ? 'Saving...' : 'Save Stock Take'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => {
                                        setSelectedLocation(e.target.value);
                                        setCounts({});
                                    }}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Search</label>
                                <div className="relative">
                                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or SKU..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stocktake Tabs */}
                        <div className="flex gap-2 border-b border-slate-700">
                            <button
                                onClick={() => setActiveStocktakeTab('parts')}
                                className={`px-4 py-2 font-medium transition-colors ${activeStocktakeTab === 'parts'
                                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Package size={16} />
                                    Parts ({parts.filter(p => !p.isSerialized && p.trackStock).length})
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveStocktakeTab('fasteners')}
                                className={`px-4 py-2 font-medium transition-colors ${activeStocktakeTab === 'fasteners'
                                    ? 'text-amber-400 border-b-2 border-amber-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Wrench size={16} />
                                    Fasteners ({fasteners.filter(f => f.trackStock).length})
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveStocktakeTab('products')}
                                className={`px-4 py-2 font-medium transition-colors ${activeStocktakeTab === 'products'
                                    ? 'text-purple-400 border-b-2 border-purple-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Box size={16} />
                                    Products ({products.filter(p => p.trackStock).length})
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3 text-center">System Count</th>
                                    <th className="px-4 py-3 text-center">Physical Count</th>
                                    <th className="px-4 py-3 text-center">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredStocktakeItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                                            {searchTerm ? `No ${activeStocktakeTab} match your search` : `No ${activeStocktakeTab} with stock tracking enabled`}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStocktakeItems.map(item => {
                                        const systemCount = getCurrentStock(item.id);
                                        const countedValue = getCountedStock(item.id);
                                        const variance = getVariance(item.id);

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-cyan-400">{item.sku}</td>
                                                <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-3 py-1 bg-slate-700 rounded text-white font-mono">
                                                        {systemCount}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={countedValue}
                                                        onChange={(e) => handleCountChange(item.id, e.target.value)}
                                                        className="w-24 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {variance !== null && (
                                                        <span className={`px-3 py-1 rounded font-mono font-bold ${variance > 0 ? 'bg-emerald-500/20 text-emerald-400' :
                                                            variance < 0 ? 'bg-red-500/20 text-red-400' :
                                                                'bg-slate-700 text-slate-400'
                                                            }`}>
                                                            {variance > 0 ? '+' : ''}{variance}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {Object.keys(counts).length > 0 && (
                        <div className="mt-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-300">
                                    <span className="font-bold">{Object.keys(counts).filter(k => counts[k] !== '').length}</span> items counted
                                </div>
                                <button
                                    onClick={() => setCounts({})}
                                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Clear All Counts
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
