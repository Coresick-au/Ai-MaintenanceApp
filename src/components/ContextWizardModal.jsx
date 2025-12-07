import React, { useState, useEffect } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons';

export const ContextWizardModal = ({ isOpen, onClose, sites, actionTitle, onComplete }) => {
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Reset when opening/closing
    useEffect(() => {
        if (isOpen) {
            setSelectedSiteId('');
            setSearchTerm('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Derive lists based on selection
    const selectedSite = sites.find(s => s.id === selectedSiteId);
    const assets = selectedSite
        ? [...(selectedSite.serviceData || []), ...(selectedSite.rollerData || [])]
        : [];

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal title={actionTitle || "Select Equipment"} onClose={onClose}>
            <div className="space-y-6 min-h-[400px]">

                {/* INSTRUCTION HEADER */}
                <div className="bg-slate-800 p-3 rounded border border-slate-700 flex items-center gap-3">
                    <div className="bg-cyan-900/50 p-2 rounded-full text-cyan-400">
                        <Icons.Search size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-200">Find Target Asset</h4>
                        <p className="text-xs text-slate-400">Select the equipment you want to work on.</p>
                    </div>
                </div>

                {/* STEP 1: SITE SELECTION */}
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">1. Select Customer / Site</label>
                    <div className="relative">
                        <select
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none appearance-none"
                            onChange={(e) => { setSelectedSiteId(e.target.value); setSearchTerm(''); }}
                            value={selectedSiteId}
                        >
                            <option value="">-- Choose Site --</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Icons.ChevronDown size={16} />
                        </div>
                    </div>
                </div>

                {/* STEP 2: ASSET SELECTION (Conditional) */}
                {selectedSite && (
                    <div className="animate-in slide-in-from-top-4 fade-in duration-300">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">2. Select Asset</label>

                        {/* Search Input */}
                        <div className="relative mb-2">
                            <input
                                type="text"
                                placeholder="Type to search asset..."
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 pl-10 text-white focus:border-cyan-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                <Icons.Search size={16} />
                            </span>
                        </div>

                        {/* Results List */}
                        <div className="h-60 overflow-y-auto border border-slate-700 rounded-lg bg-slate-800/50">
                            {filteredAssets.length > 0 ? (
                                filteredAssets.map(asset => (
                                    <button
                                        key={asset.id}
                                        onClick={() => onComplete(selectedSite, asset)}
                                        className="w-full text-left p-3 hover:bg-cyan-900/30 border-b border-slate-700/50 last:border-0 flex justify-between items-center group transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-slate-500 group-hover:bg-cyan-400"></div>
                                            <span className="font-medium text-slate-300 group-hover:text-white">{asset.name}</span>
                                        </div>
                                        <span className="font-mono text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded group-hover:text-cyan-400 group-hover:border group-hover:border-cyan-500/30">
                                            {asset.code}
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                    <Icons.AlertTriangle size={24} />
                                    <span className="text-sm">No assets found matching "{searchTerm}"</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
