import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addSerializedAsset, updateSerializedAsset, moveSerializedAsset, deleteSerializedAsset } from '../../services/inventoryService';

const STATUS_COLORS = {
    IN_STOCK: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ALLOCATED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    RMA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    MISSING: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export const SerializedAssetsView = () => {
    const [assets, setAssets] = useState([]);
    const [parts, setParts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubAssets = onSnapshot(collection(db, 'serialized_assets'), (snap) => {
            setAssets(snap.docs.map(doc => doc.data()));
        });

        const unsubParts = onSnapshot(collection(db, 'part_catalog'), (snap) => {
            const allParts = snap.docs.map(doc => doc.data());
            const serializedParts = allParts.filter(p => p.isSerialized === true);
            console.log('[SerializedAssets] Total parts:', allParts.length, 'Serialized:', serializedParts.length);
            setParts(serializedParts);
        });

        const unsubLocations = onSnapshot(collection(db, 'locations'), (snap) => {
            setLocations(snap.docs.map(doc => doc.data()));
            setLoading(false);
        });

        return () => {
            unsubAssets();
            unsubParts();
            unsubLocations();
        };
    }, []);

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            parts.find(p => p.id === asset.partId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading serialized assets...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by serial number or part name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="all">All Status</option>
                        <option value="IN_STOCK">In Stock</option>
                        <option value="ALLOCATED">Allocated</option>
                        <option value="RMA">RMA</option>
                        <option value="MISSING">Missing</option>
                    </select>
                    <div className="text-sm text-slate-400">
                        {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Icons.Plus size={18} />
                    Register Asset
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
                {filteredAssets.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        {searchTerm || statusFilter !== 'all'
                            ? 'No assets match your filters'
                            : 'No serialized assets yet. Register your first asset to get started.'}
                    </div>
                ) : (
                    filteredAssets.map(asset => {
                        const part = parts.find(p => p.id === asset.partId);
                        const location = locations.find(l => l.id === asset.currentLocationId);

                        return (
                            <div
                                key={asset.id}
                                onClick={() => setSelectedAsset(asset)}
                                className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Icons.Barcode size={20} className="text-purple-400" />
                                        <div>
                                            <div className="font-mono text-sm text-white font-bold">{asset.serialNumber}</div>
                                            <div className="text-xs text-slate-400">{part?.name || 'Unknown Part'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className={`px-2 py-1 rounded border text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                                        {asset.status.replace('_', ' ')}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Icons.MapPin size={12} />
                                        {location?.name || 'Unknown Location'}
                                    </div>

                                    {asset.purchaseDate && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Icons.Calendar size={12} />
                                            {new Date(asset.purchaseDate).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {isAddModalOpen && (
                <AddAssetModal
                    parts={parts}
                    locations={locations}
                    onClose={() => setIsAddModalOpen(false)}
                />
            )}

            {selectedAsset && (
                <AssetDetailModal
                    asset={selectedAsset}
                    part={parts.find(p => p.id === selectedAsset.partId)}
                    locations={locations}
                    onClose={() => setSelectedAsset(null)}
                />
            )}
        </div>
    );
};

const AddAssetModal = ({ parts, locations, onClose }) => {
    const [formData, setFormData] = useState({
        partId: '',
        serialNumber: '',
        currentLocationId: '',
        status: 'IN_STOCK',
        jobNumber: '',
        purchaseDate: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const userId = 'current-user'; // TODO: Get from auth context
            await addSerializedAsset(formData, userId);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to register asset');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Register Serialized Asset</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Icons.X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Part <span className="text-red-400">*</span>
                        </label>
                        <select
                            required
                            value={formData.partId}
                            onChange={(e) => setFormData(prev => ({ ...prev, partId: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="">Select part...</option>
                            {parts.map(part => (
                                <option key={part.id} value={part.id}>{part.sku} - {part.name}</option>
                            ))}
                        </select>
                        {parts.length === 0 && (
                            <p className="text-xs text-amber-400 mt-1">
                                ⚠️ No serialized parts found. Create a part with "Track by Serial Number" enabled first.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Serial Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.serialNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="FAS20339"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Location <span className="text-red-400">*</span>
                            </label>
                            <select
                                required
                                value={formData.currentLocationId}
                                onChange={(e) => setFormData(prev => ({ ...prev, currentLocationId: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="">Select location...</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Purchase Date
                            </label>
                            <input
                                type="date"
                                value={formData.purchaseDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Job Number
                            </label>
                            <input
                                type="text"
                                value={formData.jobNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, jobNumber: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Optional job reference"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows="2"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Registering...' : 'Register Asset'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AssetDetailModal = ({ asset, part, locations, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        status: asset.status,
        currentLocationId: asset.currentLocationId,
        jobNumber: asset.jobNumber || '',
        notes: asset.notes || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const userId = 'current-user';

            if (formData.currentLocationId !== asset.currentLocationId) {
                await moveSerializedAsset(
                    asset.id,
                    asset.currentLocationId,
                    formData.currentLocationId,
                    userId,
                    formData.notes,
                    formData.status
                );
            } else {
                await updateSerializedAsset(asset.id, {
                    status: formData.status,
                    notes: formData.notes
                });
            }

            setIsEditing(false);
            onClose();
        } catch (err) {
            alert(err.message || 'Failed to update asset');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete this serialized asset?\n\nSerial Number: ${asset.serialNumber}\nPart: ${part?.name || 'Unknown'}\n\nThis action cannot be undone.`)) {
            return;
        }

        setSaving(true);
        try {
            const userId = 'current-user'; // TODO: Get from auth context
            await deleteSerializedAsset(asset.id, userId, 'Asset deleted by user');
            onClose();
        } catch (err) {
            alert(err.message || 'Failed to delete asset');
        } finally {
            setSaving(false);
        }
    };

    const location = locations.find(l => l.id === asset.currentLocationId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Asset Details</h2>
                        <p className="text-sm text-slate-400 mt-1">{asset.serialNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Icons.X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-slate-400 mb-1">Part</div>
                            <div className="text-white font-medium">{part?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400">{part?.sku}</div>
                        </div>

                        <div>
                            <div className="text-xs text-slate-400 mb-1">Status</div>
                            {isEditing ? (
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="IN_STOCK">In Stock</option>
                                    <option value="ALLOCATED">Allocated</option>
                                    <option value="RMA">RMA</option>
                                    <option value="MISSING">Missing</option>
                                </select>
                            ) : (
                                <div className={`inline-block px-2 py-1 rounded border text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
                                    {asset.status.replace('_', ' ')}
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="text-xs text-slate-400 mb-1">Location</div>
                            {isEditing ? (
                                <select
                                    value={formData.currentLocationId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, currentLocationId: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-white">{location?.name || 'Unknown'}</div>
                            )}
                        </div>

                        {asset.purchaseDate && (
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Purchase Date</div>
                                <div className="text-white">{new Date(asset.purchaseDate).toLocaleDateString()}</div>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="text-xs text-slate-400 mb-1">Job Number</div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.jobNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, jobNumber: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Optional job reference"
                            />
                        ) : (
                            <div className="text-white">{asset.jobNumber || 'Not assigned'}</div>
                        )}
                    </div>

                    <div>
                        <div className="text-xs text-slate-400 mb-1">Notes</div>
                        {isEditing ? (
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows="3"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        ) : (
                            <div className="text-white">{asset.notes || 'No notes'}</div>
                        )}
                    </div>

                    <div className="flex justify-between gap-3 pt-4 border-t border-slate-700">
                        <button
                            onClick={handleDelete}
                            disabled={saving}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50"
                            title="Delete this serialized asset"
                        >
                            <Icons.Trash size={16} className="inline mr-2" />
                            Delete Asset
                        </button>

                        <div className="flex gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                                >
                                    Edit Asset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
