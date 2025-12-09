import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { getStockMovementHistory } from '../../services/inventoryService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const MOVEMENT_TYPE_ICONS = {
    ADJUSTMENT: Icons.Edit,
    TRANSFER: Icons.ArrowRight,
    INSTALLATION: Icons.Tool,
    RETURN: Icons.RotateCcw,
    STOCK_TAKE: Icons.ClipboardList
};

export const StockMovementHistory = () => {
    const [movements, setMovements] = useState([]);
    const [parts, setParts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterPartId, setFilterPartId] = useState('all');
    const [filterLocationId, setFilterLocationId] = useState('all');

    useEffect(() => {
        const unsubMovements = onSnapshot(collection(db, 'stock_movements'), (snap) => {
            const movementsList = snap.docs.map(doc => doc.data());
            movementsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setMovements(movementsList);
        });

        const unsubParts = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            setParts(snap.docs.map(doc => doc.data()));
        });

        const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
            setLocations(snap.docs.map(doc => doc.data()));
            setLoading(false);
        });

        return () => {
            unsubMovements();
            unsubParts();
            unsubLocations();
        };
    }, []);

    const filteredMovements = movements.filter(movement => {
        const matchesPart = filterPartId === 'all' || movement.partId === filterPartId;
        const matchesLocation = filterLocationId === 'all' || movement.locationId === filterLocationId;
        return matchesPart && matchesLocation;
    });

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading movement history...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Stock Movement History</h2>
                    <p className="text-sm text-slate-400 mt-1">Complete audit trail of all inventory changes</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterPartId}
                        onChange={(e) => setFilterPartId(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="all">All Parts</option>
                        {parts.map(part => (
                            <option key={part.id} value={part.id}>{part.sku} - {part.name}</option>
                        ))}
                    </select>
                    <select
                        value={filterLocationId}
                        onChange={(e) => setFilterLocationId(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="all">All Locations</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Part</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3 text-right">Quantity</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredMovements.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                                    {filterPartId !== 'all' || filterLocationId !== 'all'
                                        ? 'No movements match your filters'
                                        : 'No stock movements yet. Movements will appear here as you adjust inventory.'}
                                </td>
                            </tr>
                        ) : (
                            filteredMovements.map(movement => {
                                const part = parts.find(p => p.id === movement.partId);
                                const location = locations.find(l => l.id === movement.locationId);
                                const Icon = MOVEMENT_TYPE_ICONS[movement.movementType] || Icons.Edit;

                                return (
                                    <tr key={movement.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-300">
                                            {new Date(movement.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Icon size={14} className="text-cyan-400" />
                                                <span className="text-slate-300">{movement.movementType.replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-white font-medium">{part?.name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-400">{part?.sku}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">{location?.name || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-mono font-bold ${movement.quantityDelta > 0 ? 'text-emerald-400' :
                                                    movement.quantityDelta < 0 ? 'text-red-400' :
                                                        'text-slate-400'
                                                }`}>
                                                {movement.quantityDelta > 0 ? '+' : ''}{movement.quantityDelta}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">{movement.userId}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                                            {movement.notes || '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
