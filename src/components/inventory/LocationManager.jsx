import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addLocation, updateLocation, deleteLocation } from '../../services/inventoryService';

const LOCATION_LEVELS = {
    0: { name: 'Warehouse', icon: Icons.Building, color: 'blue' },
    1: { name: 'Zone', icon: Icons.Box, color: 'purple' },
    2: { name: 'Shelf', icon: Icons.List, color: 'emerald' },
    3: { name: 'Bin', icon: Icons.Archive, color: 'amber' }
};

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

    // Build hierarchical tree structure
    const buildLocationTree = () => {
        const tree = [];
        const map = {};

        // First pass: create map
        locations.forEach(loc => {
            map[loc.id] = { ...loc, children: [] };
        });

        // Second pass: build tree
        locations.forEach(loc => {
            if (loc.parentLocationId && map[loc.parentLocationId]) {
                map[loc.parentLocationId].children.push(map[loc.id]);
            } else if (!loc.parentLocationId) {
                tree.push(map[loc.id]);
            }
        });

        return tree;
    };

    const handleAdd = () => {
        setEditingLocation(null);
        setIsModalOpen(true);
    };

    const handleEdit = (location) => {
        setEditingLocation(location);
        setIsModalOpen(true);
    };

    const handleDelete = async (location) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${location.name}"?\n\n` +
            `This action cannot be undone. The location will only be deleted if it has no inventory or child locations.`
        );

        if (confirmed) {
            try {
                await deleteLocation(location.id);
            } catch (error) {
                alert(error.message || 'Failed to delete location');
            }
        }
    };

    const renderLocationNode = (node, depth = 0) => {
        const levelInfo = LOCATION_LEVELS[node.level || 0];
        const Icon = levelInfo?.icon || Icons.MapPin;
        const colorClass = `${levelInfo?.color || 'slate'}-500`;

        return (
            <div key={node.id} className="mb-2">
                <div
                    className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 hover:border-cyan-500/50 transition-colors"
                    style={{ marginLeft: `${depth * 24}px` }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-${colorClass}/20 text-${colorClass}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">{node.name}</h3>
                                <p className="text-xs text-slate-400">
                                    {levelInfo?.name || 'Location'}
                                    {node.children?.length > 0 && ` • ${node.children.length} child${node.children.length !== 1 ? 'ren' : ''}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {node.isReorderLocation && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400">
                                    <Icons.CheckCircle size={12} />
                                    Reorder
                                </div>
                            )}
                            <button
                                onClick={() => handleEdit(node)}
                                className="p-1.5 rounded hover:bg-slate-700 text-blue-400 transition-colors"
                                title="Edit location"
                            >
                                <Icons.Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(node)}
                                className="p-1.5 rounded hover:bg-slate-700 text-red-400 transition-colors"
                                title="Delete location"
                            >
                                <Icons.Trash size={16} />
                            </button>
                        </div>
                    </div>
                </div>
                {node.children?.map(child => renderLocationNode(child, depth + 1))}
            </div>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading locations...</div>;
    }

    const locationTree = buildLocationTree();

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Warehouse Locations</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {locations.length} location{locations.length !== 1 ? 's' : ''} in hierarchical structure
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Icons.Plus size={18} />
                    Add Location
                </button>
            </div>

            <div className="space-y-2">
                {locationTree.map(node => renderLocationNode(node))}

                {locations.length === 0 && (
                    <div className="text-center py-12 text-slate-400 bg-slate-800/30 rounded-lg border border-slate-700">
                        <Icons.MapPin size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No locations yet</p>
                        <p className="text-sm mt-1">Start by adding a warehouse location</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <LocationModal
                    location={editingLocation}
                    onClose={() => setIsModalOpen(false)}
                    allLocations={locations}
                />
            )}
        </div>
    );
};

const LocationModal = ({ location, onClose, allLocations }) => {
    const [formData, setFormData] = useState({
        name: '',
        parentLocationId: null,
        level: 0,
        coordinates: { x: 0, y: 0 },
        color: '#3b82f6',
        isReorderLocation: false,
        // Address fields (only for Warehouse level)
        addressStreet: '',
        addressStreet2: '',
        addressSuburb: '',
        addressState: 'QLD',
        addressPostcode: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (location) {
            // Normalize level to handle old 5-level hierarchy
            // Old: 0=Warehouse, 1=Zone, 2=Aisle, 3=Shelf, 4=Bin
            // New: 0=Warehouse, 1=Zone, 2=Shelf, 3=Bin
            let normalizedLevel = location.level || 0;
            if (normalizedLevel > 3) {
                normalizedLevel = 3; // Old Bin (4) becomes new Bin (3)
            }

            setFormData({
                name: location.name,
                parentLocationId: location.parentLocationId || null,
                level: normalizedLevel,
                coordinates: location.coordinates || { x: 0, y: 0 },
                color: location.color || '#3b82f6',
                isReorderLocation: location.isReorderLocation || false,
                // Address fields
                addressStreet: location.addressStreet || '',
                addressStreet2: location.addressStreet2 || '',
                addressSuburb: location.addressSuburb || '',
                addressState: location.addressState || 'QLD',
                addressPostcode: location.addressPostcode || ''
            });
        }
    }, [location]);

    // Get available parent locations based on selected level
    const getAvailableParents = () => {
        if (formData.level === 0) return []; // Warehouses have no parent

        const parentLevel = formData.level - 1;
        return allLocations.filter(loc => {
            // Don't allow selecting self as parent
            if (location && loc.id === location.id) return false;
            // Only show locations of the immediate parent level
            return (loc.level || 0) === parentLevel;
        });
    };

    const handleLevelChange = (newLevel) => {
        setFormData(prev => ({
            ...prev,
            level: newLevel,
            parentLocationId: newLevel === 0 ? null : prev.parentLocationId
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.level > 0 && !formData.parentLocationId) {
            setError(`Please select a parent ${LOCATION_LEVELS[formData.level - 1].name.toLowerCase()}`);
            return;
        }

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

    const availableParents = getAvailableParents();
    const currentLevel = LOCATION_LEVELS[formData.level] || LOCATION_LEVELS[0]; // Fallback to Warehouse if invalid

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-md rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
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

                    {/* Level Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Location Type <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(LOCATION_LEVELS).map(([level, info]) => {
                                const Icon = info.icon;
                                const isSelected = formData.level === parseInt(level);
                                return (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => handleLevelChange(parseInt(level))}
                                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${isSelected
                                            ? `border-${info.color}-500 bg-${info.color}-500/10 text-${info.color}-400`
                                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span className="font-medium text-sm">{info.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Parent Location Selection */}
                    {formData.level > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Parent {LOCATION_LEVELS[formData.level - 1].name} <span className="text-red-400">*</span>
                            </label>
                            <select
                                required
                                value={formData.parentLocationId || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, parentLocationId: e.target.value || null }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="">-- Select Parent --</option>
                                {availableParents.map(parent => (
                                    <option key={parent.id} value={parent.id}>
                                        {parent.name}
                                    </option>
                                ))}
                            </select>
                            {availableParents.length === 0 && (
                                <p className="text-xs text-amber-400 mt-1">
                                    No parent locations available. Create a {LOCATION_LEVELS[formData.level - 1].name.toLowerCase()} first.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            {currentLevel.name} Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder={`e.g., ${currentLevel.name} ${formData.level === 0 ? 'Main' : formData.level === 1 ? 'A' : formData.level === 2 ? 'Top' : '1'}`}
                        />
                    </div>

                    {/* Coordinates for Map */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Grid X Position
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.coordinates.x}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    coordinates: { ...prev.coordinates, x: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Grid Y Position
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.coordinates.y}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    coordinates: { ...prev.coordinates, y: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>

                    {/* Color for visualization */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Display Color
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                className="w-16 h-10 rounded border border-slate-700 bg-slate-800"
                            />
                            <input
                                type="text"
                                value={formData.color}
                                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="#3b82f6"
                            />
                        </div>
                    </div>

                    {/* Reorder Location Toggle */}
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

                    {/* Address Section - Only for Warehouse level */}
                    {formData.level === 0 && (
                        <div className="bg-slate-800/30 rounded-lg border border-slate-700 p-4 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icons.MapPin size={16} className="text-cyan-400" />
                                <h3 className="text-sm font-semibold text-white">Warehouse Address</h3>
                                <span className="text-xs text-slate-400">(for delivery tracking)</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Street Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.addressStreet}
                                    onChange={(e) => setFormData(prev => ({ ...prev, addressStreet: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="123 Warehouse Drive"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Address Line 2
                                </label>
                                <input
                                    type="text"
                                    value={formData.addressStreet2}
                                    onChange={(e) => setFormData(prev => ({ ...prev, addressStreet2: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Building A (optional)"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Suburb
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.addressSuburb}
                                        onChange={(e) => setFormData(prev => ({ ...prev, addressSuburb: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Brisbane"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        State
                                    </label>
                                    <select
                                        value={formData.addressState}
                                        onChange={(e) => setFormData(prev => ({ ...prev, addressState: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="QLD">QLD</option>
                                        <option value="NSW">NSW</option>
                                        <option value="VIC">VIC</option>
                                        <option value="SA">SA</option>
                                        <option value="WA">WA</option>
                                        <option value="TAS">TAS</option>
                                        <option value="NT">NT</option>
                                        <option value="ACT">ACT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Postcode
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.addressPostcode}
                                        onChange={(e) => setFormData(prev => ({ ...prev, addressPostcode: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="4000"
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

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
