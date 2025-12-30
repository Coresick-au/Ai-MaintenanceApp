import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';

/**
 * LocationSelect - Dropdown for selecting hierarchical warehouse locations
 * @param {Object} props
 * @param {string} props.value - Selected location ID
 * @param {Function} props.onChange - Callback when location changes (receives locationId)
 * @param {boolean} props.required - Whether location selection is required
 */
export const LocationSelect = ({ value, onChange, required = false }) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'locations'),
            (snapshot) => {
                const locationsList = snapshot.docs.map(doc => doc.data());
                setLocations(locationsList);
                setLoading(false);
            },
            (error) => {
                console.error('[LocationSelect] Error fetching locations:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Build hierarchical path for display
    const getLocationPath = (locationId) => {
        if (!locationId) return 'No Location Assigned';

        const path = [];
        let current = locations.find(loc => loc.id === locationId);

        while (current) {
            path.unshift(current.name);
            current = current.parentLocationId
                ? locations.find(loc => loc.id === current.parentLocationId)
                : null;
        }

        return path.join(' > ') || 'Unknown Location';
    };

    // Get leaf locations only (bins and shelves without children)
    const getSelectableLocations = () => {
        // Find locations that are not parents of any other location
        const parentIds = new Set(locations.map(loc => loc.parentLocationId).filter(Boolean));

        return locations
            .filter(loc => {
                // Include if it's not a parent OR if it's level 2 or 3 (shelf/bin)
                return !parentIds.has(loc.id) || (loc.level >= 2);
            })
            .filter(loc => {
                // Filter by search term
                if (!searchTerm) return true;
                const path = getLocationPath(loc.id).toLowerCase();
                return path.includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => {
                const pathA = getLocationPath(a.id);
                const pathB = getLocationPath(b.id);
                return pathA.localeCompare(pathB);
            });
    };

    const selectableLocations = getSelectableLocations();
    const selectedLocation = locations.find(loc => loc.id === value);

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
                Location {required && <span className="text-red-400">*</span>}
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-left text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 flex items-center justify-between"
                >
                    <span className={value ? 'text-white' : 'text-slate-400'}>
                        {loading ? 'Loading...' : getLocationPath(value)}
                    </span>
                    <Icons.ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        {/* Search */}
                        <div className="p-2 border-b border-slate-700 sticky top-0 bg-slate-800">
                            <div className="relative">
                                <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search locations..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {/* Clear Selection */}
                        {!required && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange(null);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors text-slate-400 text-sm border-b border-slate-700"
                            >
                                <Icons.X size={14} className="inline mr-2" />
                                No Location
                            </button>
                        )}

                        {/* Location Options */}
                        {selectableLocations.map(location => (
                            <button
                                key={location.id}
                                type="button"
                                onClick={() => {
                                    onChange(location.id);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors text-sm ${value === location.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-white'
                                    }`}
                            >
                                <Icons.MapPin size={14} className="inline mr-2 opacity-60" />
                                {getLocationPath(location.id)}
                            </button>
                        ))}

                        {selectableLocations.length === 0 && (
                            <div className="px-3 py-4 text-center text-slate-400 text-sm">
                                {searchTerm ? 'No matching locations found' : 'No locations available. Add locations in the Locations tab.'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {value && selectedLocation && (
                <p className="text-xs text-slate-400">
                    Level {selectedLocation.level}: {['Warehouse', 'Zone', 'Shelf', 'Bin'][selectedLocation.level || 0]}
                </p>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setIsOpen(false);
                        setSearchTerm('');
                    }}
                />
            )}
        </div>
    );
};
