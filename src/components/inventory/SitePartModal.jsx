import React, { useState, useEffect, useContext } from 'react';
import { Icons } from '../../constants/icons';
import { useGlobalData } from '../../context/GlobalDataContext';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { addSitePart, updateSitePart } from '../../services/sitePartService';

// Mapping configuration could be moved to a config file, but keeping it here for simplicity
const CATALOG_TYPES = [
    { value: 'none', label: 'No Link (Manual Only)' },
    { value: 'part', label: 'Part Catalog', collection: 'part_catalog', getLabel: d => `${d.name} (${d.sku || 'No SKU'})`, getCode: d => d.sku || d.name?.substring(0, 10).toUpperCase().replace(/\s+/g, '-') || 'UNKNOWN' },
    { value: 'fastener', label: 'Fastener Catalog', collection: 'fastener_catalog', getLabel: d => `${d.name} (${d.sku || 'No SKU'})`, getCode: d => d.sku || d.name?.substring(0, 10).toUpperCase().replace(/\s+/g, '-') || 'UNKNOWN' },
    { value: 'electrical', label: 'Electrical Catalog', collection: 'electrical_catalog', getLabel: d => `${d.name} (${d.partNumber || d.sku || 'No PN'})`, getCode: d => d.partNumber || d.sku || d.name?.substring(0, 10).toUpperCase().replace(/\s+/g, '-') || 'UNKNOWN' },
    { value: 'product', label: 'Product Catalog', collection: 'products', getLabel: d => d.name, getCode: d => d.sku || d.name?.substring(0, 10).toUpperCase().replace(/\s+/g, '-') || 'UNKNOWN' },
    { value: 'sub_assembly', label: 'Sub Assembly Catalog', collection: 'sub_assemblies', getLabel: d => d.name, getCode: d => d.name?.substring(0, 10).toUpperCase().replace(/\s+/g, '-') || 'UNKNOWN' },
    // Specialized
    { value: 'roller', label: 'Specialized - Rollers', collection: 'rollers_cost_history', getLabel: d => `Roller ${d.diameter}x${d.faceLength} (${d.materialType})`, getCode: d => `ROL-${d.diameter}x${d.faceLength}` },
    { value: 'idler', label: 'Specialized - Idler Frames', collection: 'idler_frames_cost_history', getLabel: d => `Idler Frame ${d.frameType} BW${d.beltWidth}`, getCode: d => `IDL-${d.frameType}-${d.beltWidth}` },
    { value: 'speed_sensor', label: 'Specialized - Speed Sensors', collection: 'speed_sensors_cost_history', getLabel: d => `Speed Sensor ${d.designType}`, getCode: d => `SPD-${d.designType}` },
    { value: 'weigh_module', label: 'Specialized - Weigh Modules', collection: 'weigh_modules_cost_history', getLabel: d => `Weigh Module ${d.modelId}`, getCode: d => `WGH-${d.modelId}` },
    { value: 'tmd_frame', label: 'Specialized - TMD Frames', collection: 'tmd_frames_cost_history', getLabel: d => `TMD Frame BW${d.beltWidth}`, getCode: d => `TMD-${d.beltWidth}` },
    { value: 'billet_weight', label: 'Specialized - Billet Weights', collection: 'billet_weights_cost_history', getLabel: d => `Billet Weight ${d.weightKg}kg`, getCode: d => `BWT-${d.weightKg}` },
];

export function SitePartModal({ isOpen, onClose, editingPart, onSuccess }) {
    const { getAllMaintenanceAppSites } = useGlobalData();
    const sites = getAllMaintenanceAppSites();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [partType, setPartType] = useState('ROLLER'); // ROLLER, IDLER, etc.
    const [specs, setSpecs] = useState({ dia: '', length: '', shaft: '' });
    const [manualPartNumber, setManualPartNumber] = useState('');
    const [isManualNumber, setIsManualNumber] = useState(false);

    // Internal Part Link
    const [linkType, setLinkType] = useState('none'); // none, roller, part
    const [internalParts, setInternalParts] = useState([]);
    const [selectedInternalId, setSelectedInternalId] = useState('');
    const [description, setDescription] = useState('');

    // Assets
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedAssetIds, setSelectedAssetIds] = useState([]);
    const [assetSearch, setAssetSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Removed explicit loadInternalParts() call here as it's now handled by the linkType effect
            if (editingPart) {
                // Populate form
                setSelectedSiteId(editingPart.siteId);
                setDescription(editingPart.description);
                setManualPartNumber(editingPart.partNumber);
                setIsManualNumber(true); // Default to manual for edit for safety
                setSelectedAssetIds(editingPart.linkedAssetIds || []);
                setLinkType(editingPart.internalPartType || 'none');
                setSelectedInternalId(editingPart.internalPartId || '');
            } else {
                // Reset form
                setSelectedSiteId('');
                setPartType('ROLLER');
                setSpecs({ dia: '', length: '', shaft: '' });
                setManualPartNumber('');
                setIsManualNumber(false);
                setLinkType('none');
                setSelectedInternalId('');
                setDescription('');
                setSelectedAssetIds([]);
                setAssetSearch('');
            }
        }
    }, [isOpen, editingPart]);

    // Update assets when site changes
    useEffect(() => {
        if (selectedSiteId) {
            const site = sites.find(s => s.id === selectedSiteId);
            if (site) {
                const assets = [
                    ...(site.serviceData || []).map(a => ({ ...a, type: 'Service' })),
                    ...(site.rollerData || []).map(a => ({ ...a, type: 'Roller' }))
                ];
                setAvailableAssets(assets);
            }
        } else {
            setAvailableAssets([]);
        }
    }, [selectedSiteId]); // Removed sites from dependency as it's now derived

    // Load available internal parts based on selected Link Type
    useEffect(() => {
        if (!isOpen) return;

        const loadCatalog = async () => {
            if (linkType === 'none') {
                setInternalParts([]);
                return;
            }

            // Find config
            const config = CATALOG_TYPES.find(c => c.value === linkType);
            if (!config || !config.collection) return;

            setLoading(true);
            try {
                const snap = await getDocs(collection(db, config.collection));
                const items = snap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        type: linkType,
                        label: config.getLabel(d),
                        partNumberCode: config.getCode(d),
                        ...d
                    }
                });

                items.sort((a, b) => a.label.localeCompare(b.label));
                setInternalParts(items);
            } catch (err) {
                console.error("Error loading catalog:", err);
            } finally {
                setLoading(false);
            }
        };

        loadCatalog();
    }, [linkType, isOpen]); // Re-run when type changes

    const getGeneratedPartNumber = () => {
        if (isManualNumber) return manualPartNumber;

        const site = sites.find(s => s.id === selectedSiteId);
        // Fallback or extract code. User prompt mentioned "CUR" for Curragh. 
        // We might need a map or just take first 3 chars uppercase if no code field.
        // Assuming Site object doesn't have 'code' yet based on previous inspection.
        const siteCode = site ? (site.code || site.name.substring(0, 3).toUpperCase()) : 'XXX';

        // If linked to an internal part, use that code
        if (linkType !== 'none' && selectedInternalId) {
            const linkedPart = internalParts.find(p => p.id === selectedInternalId);
            if (linkedPart && linkedPart.partNumberCode) {
                return `${siteCode}-${linkedPart.partNumberCode}`;
            }
        }

        const specString = Object.values(specs).filter(Boolean).join('-');
        return `${siteCode}-${partType}-${specString}`;
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const partNumber = getGeneratedPartNumber();
            const site = sites.find(s => s.id === selectedSiteId);

            const data = {
                siteId: selectedSiteId,
                siteName: site?.name || 'Unknown',
                partNumber,
                description,
                internalPartId: selectedInternalId,
                internalPartType: linkType,
                linkedAssetIds: selectedAssetIds
            };

            if (editingPart) {
                await updateSitePart(editingPart.id, data);
            } else {
                await addSitePart(data);
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to save part');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 className="text-xl font-bold text-white">
                        {editingPart ? 'Edit Site Part' : 'New Site Part'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <Icons.X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Site Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Site</label>
                        <select
                            value={selectedSiteId}
                            onChange={e => setSelectedSiteId(e.target.value)}
                            className="w-full bg-slate-800 border-slate-600 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-cyan-500"
                            disabled={loading}
                        >
                            <option value="">Select Site...</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Part Number Generation */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-slate-200 font-medium">Part Number</h3>
                            <button
                                onClick={() => setIsManualNumber(!isManualNumber)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                            >
                                {isManualNumber ? 'Switch to Auto-Generator' : 'Switch to Manual Entry'}
                            </button>
                        </div>

                        {isManualNumber ? (
                            <input
                                type="text"
                                value={manualPartNumber}
                                onChange={e => setManualPartNumber(e.target.value)}
                                className="w-full bg-slate-900 border-slate-600 rounded p-2 text-white"
                                placeholder="e.g. CUR-ROLL-130-579-22"
                            />
                        ) : (
                            <div className="space-y-4">
                                {linkType === 'none' ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-400">Type</label>
                                            <select
                                                value={partType}
                                                onChange={e => setPartType(e.target.value)}
                                                className="w-full bg-slate-900 border-slate-600 rounded p-2 text-white text-sm"
                                            >
                                                <option value="ROLL">ROLL (Roller)</option>
                                                <option value="IDL">IDL (Idler)</option>
                                                <option value="PUL">PUL (Pulley)</option>
                                                <option value="BELT">BELT (Belt)</option>
                                                <option value="GEN">GEN (General)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Dia/Size</label>
                                            <input
                                                type="text"
                                                value={specs.dia}
                                                onChange={e => setSpecs({ ...specs, dia: e.target.value })}
                                                className="w-full bg-slate-900 border-slate-600 rounded p-2 text-white text-sm"
                                                placeholder="130"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Length</label>
                                            <input
                                                type="text"
                                                value={specs.length}
                                                onChange={e => setSpecs({ ...specs, length: e.target.value })}
                                                className="w-full bg-slate-900 border-slate-600 rounded p-2 text-white text-sm"
                                                placeholder="579"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Shaft/Var</label>
                                            <input
                                                type="text"
                                                value={specs.shaft}
                                                onChange={e => setSpecs({ ...specs, shaft: e.target.value })}
                                                className="w-full bg-slate-900 border-slate-600 rounded p-2 text-white text-sm"
                                                placeholder="22"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic">
                                        Part Number will be auto-generated from the selected Catalog Item.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-2 text-right">
                            <span className="text-slate-400 text-sm">Preview: </span>
                            <code className="bg-slate-900 px-2 py-1 rounded text-emerald-400 font-mono">
                                {getGeneratedPartNumber()}
                            </code>
                        </div>
                    </div>

                    {/* Description & Internal Link */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-800 border-slate-600 rounded-lg p-2.5 text-white h-32 resize-none"
                                placeholder="Detailed description of the part..."
                            />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Link to Inventory</label>
                                <select
                                    value={linkType}
                                    onChange={e => setLinkType(e.target.value)}
                                    className="w-full bg-slate-800 border-slate-600 rounded-lg p-2 text-white mb-2"
                                >
                                    <option value="none">No Link (Manual Only)</option>
                                    {CATALOG_TYPES.filter(t => t.value !== 'none').map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>

                                {linkType !== 'none' && (
                                    <select
                                        value={selectedInternalId}
                                        onChange={e => setSelectedInternalId(e.target.value)}
                                        className="w-full bg-slate-800 border-slate-600 rounded-lg p-2 text-white"
                                        disabled={loading}
                                    >
                                        <option value="">{loading ? 'Loading...' : 'Select Item...'}</option>
                                        {internalParts.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Assets Linking */}
                    <div className="border-t border-slate-700 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-slate-200 font-medium">Link to Site Assets</h3>
                            <div className="relative w-48">
                                <Icons.Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={assetSearch}
                                    onChange={e => setAssetSearch(e.target.value)}
                                    placeholder="Search assets..."
                                    className="w-full bg-slate-900 border-slate-600 rounded text-xs py-1.5 pl-8 pr-2 text-white focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>
                        </div>
                        {selectedSiteId ? (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                {availableAssets.filter(a =>
                                    a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                                    (a.code || '').toLowerCase().includes(assetSearch.toLowerCase())
                                ).length === 0 ? (
                                    <p className="p-4 text-slate-400 text-center text-sm">No matching assets found.</p>
                                ) : (
                                    <div className="divide-y divide-slate-700">
                                        {availableAssets
                                            .filter(a =>
                                                a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                                                (a.code || '').toLowerCase().includes(assetSearch.toLowerCase())
                                            )
                                            .map(asset => (
                                                <label key={asset.id} className="flex items-center gap-3 p-3 hover:bg-slate-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAssetIds.includes(asset.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedAssetIds([...selectedAssetIds, asset.id]);
                                                            } else {
                                                                setSelectedAssetIds(selectedAssetIds.filter(id => id !== asset.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-white">{asset.name}</div>
                                                        <div className="text-xs text-slate-400">{asset.code} • {asset.type}</div>
                                                    </div>
                                                </label>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic">Select a site to view assets.</p>
                        )}
                    </div>

                    {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
                </div>

                <div className="p-6 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving && <Icons.Loader size={18} className="animate-spin" />}
                        Save Part
                    </button>
                </div>
            </div>
        </div >
    );
}
