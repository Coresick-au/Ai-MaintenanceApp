import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addLocation, updateLocation } from '../../services/inventoryService';

export const LocationManager = () => {
    const [locations, setLocations] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'locations'),
            (snapshot) => {
                const locationsList = snapshot.docs.map(doc => doc.data());
                setLocations(locationsList);
                setLoading(false);
            },
            (error) => {
                console.error('[LocationManager] Error fetching locations:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleAdd = () => {
        setEditingLocation(null);
        setIsModalOpen(true);
    };

    const handleEdit = (location) => {
        setEditingLocation(location);
        setIsModalOpen(true);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading locations...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Locations</h2>
                    <p className="text-sm text-slate-400 mt-1">{locations.length} location{locations.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Icons.Plus size={18} />
                    Add Location
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map(location => (
                    <div
                        key={location.id}
                        className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${location.type === 'warehouse' ? 'bg-blue-500/20 text-blue-400' :
                                        location.type === 'truck' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-slate-700 text-slate-400'
                                    }`}>
                                    {location.type === 'warehouse' ? <Icons.Building size={20} /> :
                                        location.type === 'truck' ? <Icons.Truck size={20} /> :
                                            <Icons.MapPin size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{location.name}</h3>
                                    <p className="text-xs text-slate-400 capitalize">{location.type}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleEdit(location)}
                                className="p-1.5 rounded hover:bg-slate-700 text-blue-400 transition-colors"
                            >
                                <Icons.Edit size={16} />
                            </button>
                        </div>

                        {location.isReorderLocation && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400">
                                <Icons.CheckCircle size={14} />
                                Reorder Location
                            </div>
                        )}
                    </div>
                ))}

                {locations.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        No locations yet. Add your first location to get started.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <LocationModal
                    location={editingLocation}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

const LocationModal = ({ location, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'warehouse',
        isReorderLocation: false
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (location) {
            setFormData({
                name: location.name,
                type: location.type,
                isReorderLocation: location.isReorderLocation
            });
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            if (location) {
                await updateLocation(location.id, formData);
            } else {
                await addLocation(formData);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save location');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">
                        {location ? 'Edit Location' : 'Add Location'}
                    </h2>
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
                            Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Warehouse - Banyo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Type <span className="text-red-400">*</span>
                        </label>
                        <select
                            required
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="warehouse">Warehouse</option>
                            <option value="truck">Truck</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <input
                            type="checkbox"
                            id="isReorderLocation"
                            checked={formData.isReorderLocation}
                            onChange={(e) => setFormData(prev => ({ ...prev, isReorderLocation: e.target.checked }))}
                            className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                        />
                        <label htmlFor="isReorderLocation" className="text-sm text-slate-300 cursor-pointer">
                            Use as reorder location (for stock replenishment)
                        </label>
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
                            {saving ? 'Saving...' : (location ? 'Update' : 'Add Location')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
