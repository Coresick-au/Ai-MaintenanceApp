// src/components/SiteDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './UIComponents';

export const SiteDropdown = ({ sites, selectedSiteId, onSiteChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedSite = sites.find(s => s.id === selectedSiteId);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSiteSelect = (siteId) => {
        onSiteChange(siteId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-slate-100 font-semibold text-base hover:text-cyan-400 transition-colors group"
            >
                <span>{selectedSite?.name || 'Select Site'}</span>
                <Icons.ChevronDown
                    size={16}
                    className={`text-slate-400 group-hover:text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="max-h-96 overflow-y-auto">
                        {sites.map((site) => {
                            const isSelected = site.id === selectedSiteId;
                            const isActive = site.active !== false;

                            return (
                                <button
                                    key={site.id}
                                    type="button"
                                    onClick={() => handleSiteSelect(site.id)}
                                    disabled={!isActive}
                                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors border-b border-slate-700/50 last:border-b-0 ${isSelected
                                            ? 'bg-cyan-600 text-white font-semibold'
                                            : isActive
                                                ? 'text-slate-200 hover:bg-cyan-600 hover:text-white'
                                                : 'text-slate-500 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <div className="flex flex-col">
                                        <span className={isSelected ? 'font-bold' : ''}>{site.name}</span>
                                        {site.location && (
                                            <span className={`text-xs ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                                                {site.location}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <Icons.CheckCircle size={18} className="text-white" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
