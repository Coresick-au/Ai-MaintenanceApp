import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { adjustStockQuantity } from '../../services/inventoryService';

export const StockTakeMode = () => {
    const [parts, setParts] = useState([]);
    const [fasteners, setFasteners] = useState([]);
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [counts, setCounts] = useState({});
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('parts'); // 'parts', 'fasteners', 'products'

    useEffect(() => {
        const unsubParts = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            // Only non-serialized, trackStock parts
            const partsList = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => !p.isSerialized && p.trackStock);
            setParts(partsList);
        });

        const unsubFasteners = onSnapshot(collection(db, 'fastener_catalog'), (snap) => {
            // Only trackStock fasteners
            const fastenersList = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(f => f.trackStock);
            setFasteners(fastenersList);
        });

        const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
            // Only trackStock products
            const productsList = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.trackStock);
            setProducts(productsList);
        });

        const unsubInventory = onSnapshot(collection(db, 'inventory_state'), (snap) => {
            setInventory(snap.docs.map(doc => doc.data()));
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
            unsubLocations();
        };
    }, []);

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

    const handleSubmit = async () => {
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

    // Get current items based on active tab
    const getCurrentItems = () => {
        switch (activeTab) {
            case 'parts':
                return parts;
            case 'fasteners':
                return fasteners;
            case 'products':
                return products;
            default:
                return [];
        }
    };

    const filteredItems = getCurrentItems().filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getItemLabel = () => {
        switch (activeTab) {
            case 'parts':
                return 'Part';
            case 'fasteners':
                return 'Fastener';
            case 'products':
                return 'Product';
            default:
                return 'Item';
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading stock take...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Stock Take Mode</h2>
                        <p className="text-sm text-slate-400 mt-1">Physical inventory count</p>
                    </div>
                    <button
                        onClick={handleSubmit}
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

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('parts')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'parts'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Package size={16} />
                            Parts ({parts.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('fasteners')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'fasteners'
                                ? 'text-amber-400 border-b-2 border-amber-400'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Wrench size={16} />
                            Fasteners ({fasteners.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 font-medium transition-colors ${activeTab === 'products'
                                ? 'text-purple-400 border-b-2 border-purple-400'
                                : 'text-slate-400 hover:text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Box size={16} />
                            Products ({products.length})
                        </div>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">{getItemLabel()} Name</th>
                            <th className="px-4 py-3 text-center">System Count</th>
                            <th className="px-4 py-3 text-center">Physical Count</th>
                            <th className="px-4 py-3 text-center">Variance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                                    {searchTerm ? `No ${activeTab} match your search` : `No ${activeTab} with stock tracking enabled`}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map(item => {
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
    );
};
