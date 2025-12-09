import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';

export const StockOverview = ({ onAdjustStock }) => {
    const [parts, setParts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [serializedAssets, setSerializedAssets] = useState([]);
    const [locations, setLocations] = useState([]);
    const [expandedPartId, setExpandedPartId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Real-time listeners
    useEffect(() => {
        const unsubParts = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            setParts(snap.docs.map(doc => doc.data()));
        });

        const unsubInventory = onSnapshot(collection(db, 'inventory_state'), (snap) => {
            setInventory(snap.docs.map(doc => doc.data()));
        });

        const unsubAssets = onSnapshot(collection(db, 'serialized_assets'), (snap) => {
            setSerializedAssets(snap.docs.map(doc => doc.data()));
        });

        const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
            setLocations(snap.docs.map(doc => doc.data()));
            setLoading(false);
        });

        return () => {
            unsubParts();
            unsubInventory();
            unsubAssets();
            unsubLocations();
        };
    }, []);

    // Aggregate stock data
    const stockOverview = useMemo(() => {
        return parts.map(part => {
            let totalQuantity = 0;
            const locationBreakdown = [];

            if (part.isSerialized) {
                // Count serialized assets by location
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
                // Sum inventory records
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
            const actualMargin = part.listPrice > 0
                ? ((part.listPrice - part.costPrice) / part.listPrice) * 100
                : 0;

            return {
                part,
                totalQuantity,
                locationBreakdown,
                serializedAssets: part.isSerialized
                    ? serializedAssets.filter(a => a.partId === part.id && a.status === 'IN_STOCK')
                    : [],
                isLowStock,
                actualMarginPercent: actualMargin
            };
        });
    }, [parts, inventory, serializedAssets, locations]);

    const formatCurrency = (cents) => `$${(cents / 100).toFixed(2)}`;

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading stock overview...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-white">Stock Levels</h2>
                <p className="text-sm text-slate-400 mt-1">
                    {stockOverview.filter(s => s.isLowStock).length} part{stockOverview.filter(s => s.isLowStock).length !== 1 ? 's' : ''} below reorder level
                </p>
            </div>

            <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-8"></th>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Part Name</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-right">Total On Hand</th>
                            <th className="px-4 py-3 text-right">Reorder Level</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {stockOverview.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                                    No parts in catalog. Add parts to start tracking stock.
                                </td>
                            </tr>
                        ) : (
                            stockOverview.map(item => (
                                <React.Fragment key={item.part.id}>
                                    <tr className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {item.part.isSerialized && item.serializedAssets.length > 0 && (
                                                <button
                                                    onClick={() => setExpandedPartId(expandedPartId === item.part.id ? null : item.part.id)}
                                                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                                                >
                                                    {expandedPartId === item.part.id ? (
                                                        <Icons.ChevronDown size={16} className="text-cyan-400" />
                                                    ) : (
                                                        <Icons.ChevronRight size={16} className="text-slate-400" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-cyan-400">{item.part.sku}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {item.part.isSerialized && (
                                                    <Icons.Barcode size={16} className="text-purple-400" />
                                                )}
                                                <span className="text-white font-medium">{item.part.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.part.isSerialized
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : 'bg-slate-700 text-slate-300'
                                                }`}>
                                                {item.part.isSerialized ? 'Serialized' : 'Consumable'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-bold ${item.isLowStock ? 'text-red-400' : 'text-white'}`}>
                                                {item.totalQuantity === 0 ? 'No Stock' : item.totalQuantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-300">{item.part.reorderLevel}</td>
                                        <td className="px-4 py-3 text-center">
                                            {item.totalQuantity === 0 ? (
                                                <span className="flex items-center justify-center gap-1 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-300 font-medium">
                                                    <Icons.XCircle size={12} />
                                                    No Stock
                                                </span>
                                            ) : item.isLowStock ? (
                                                <span className="flex items-center justify-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 font-medium">
                                                    <Icons.AlertTriangle size={12} />
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onAdjustStock(item.part)}
                                                className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                                title="Adjust Stock"
                                            >
                                                <Icons.Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded Row for Serialized Assets */}
                                    {expandedPartId === item.part.id && item.part.isSerialized && (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-3 bg-slate-900/50">
                                                <div className="space-y-2">
                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">Serial Numbers:</div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.serializedAssets.map(asset => {
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
    );
};
