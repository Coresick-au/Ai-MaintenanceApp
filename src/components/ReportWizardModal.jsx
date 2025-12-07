import React, { useState } from 'react';
import { Modal } from './UIComponents';
import { Icons } from '../constants/icons';

export const ReportWizardModal = ({ isOpen, onClose, sites, onSelectAsset }) => {
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const selectedSite = sites.find(s => s.id === selectedSiteId);
    const assets = selectedSite
        ? [...(selectedSite.serviceData || []), ...(selectedSite.rollerData || [])]
        : [];

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal title="Select Asset for Report" onClose={onClose}>
            <div className="space-y-4">

                {/* Step 1: Select Site */}
                <div>
                    <label className="text-sm text-slate-400 block mb-2">1. Customer / Site</label>
                    <select
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                        onChange={(e) => { setSelectedSiteId(e.target.value); setSearchTerm(''); }}
                        value={selectedSiteId}
                    >
                        <option value="">-- Select Site --</option>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name} - {s.customer}</option>)}
                    </select>
                </div>

                {/* Step 2: Select Asset */}
                {selectedSite && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="text-sm text-slate-400 block mb-2">2. Select Equipment</label>
                        <input
                            type="text"
                            placeholder="Search asset name or code..."
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mb-2"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />

                        <div className="max-h-60 overflow-y-auto border border-slate-700 rounded bg-slate-900/50">
                            {filteredAssets.map(asset => (
                                <button
                                    key={asset.id}
                                    onClick={() => onSelectAsset(selectedSite, asset)}
                                    className="w-full text-left p-3 hover:bg-cyan-900/20 hover:text-cyan-400 border-b border-slate-800 last:border-0 flex justify-between group transition-colors"
                                >
                                    <span className="font-bold text-sm text-slate-200 group-hover:text-cyan-400">{asset.name}</span>
                                    <span className="font-mono text-xs text-slate-500 group-hover:text-cyan-500">{asset.code}</span>
                                </button>
                            ))}
                            {filteredAssets.length === 0 && <div className="p-4 text-center text-slate-500 text-xs">No assets found</div>}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
