import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { addSubAssembly, updateSubAssembly, addPartToBOM, removePartFromBOM, updatePartQuantity, addFastenerToBOM, removeFastenerFromBOM, updateFastenerQuantity } from '../../services/subAssemblyService';
import { generateNextSubAssemblySKU } from '../../utils/skuGenerator';
import { CategorySelect } from './categories/CategorySelect';
import { LocationSelect } from './LocationSelect';
import { CategoryProvider } from '../../context/CategoryContext';
import { BOMEditor } from './BOMEditor';
import { ProductCostToggle } from './ProductCostToggle';
import { ListPriceToggle } from './ListPriceToggle';
import { subAssemblyCompositionRepository } from '../../repositories';
import { getPartCostAtDate } from '../../services/costingService';
import { getLabourRate } from '../../services/settingsService';

/**
 * Sub Assembly Catalog Modal for creating/editing sub assemblies
 * @description Modal component for sub assembly CRUD operations with BOM management
 * and cost type selection.
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} [props.editingSubAssembly] - Sub assembly being edited (null for new sub assembly)
 * @returns {JSX.Element} Rendered modal
 */
export const SubAssemblyCatalogModal = ({ isOpen, onClose, onSuccess, editingSubAssembly = null }) => {
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '', // Legacy field
        categoryId: null,
        subcategoryId: null,
        componentCategory: null, // NEW: For specialized components (Weigh Module, Billet Weight, etc.)
        description: '',
        costType: 'MANUAL',
        manualCost: '',
        listPrice: '',
        targetMarginPercent: 30,
        trackStock: false,
        reorderLevel: 10,
        labourHours: 0,
        labourMinutes: 0,
        locationId: null
    });
    const [bomEntries, setBomEntries] = useState([]);
    const [bomFastenerEntries, setBomFastenerEntries] = useState([]);
    const [costType, setCostType] = useState('CALCULATED');
    const [listPriceSource, setListPriceSource] = useState('MANUAL');
    const [bomCost, setBomCost] = useState(0);
    const [activeTab, setActiveTab] = useState('details');
    const [saving, setSaving] = useState(false);
    const [generatingSKU, setGeneratingSKU] = useState(false);
    const [error, setError] = useState('');

    // Load sub assembly data when editing
    useEffect(() => {
        const loadSubAssemblyData = async () => {
            if (editingSubAssembly) {
                setFormData({
                    sku: editingSubAssembly.sku,
                    name: editingSubAssembly.name,
                    category: editingSubAssembly.category || '', // Legacy field
                    categoryId: editingSubAssembly.categoryId || null,
                    subcategoryId: editingSubAssembly.subcategoryId || null,
                    componentCategory: editingSubAssembly.componentCategory || null,
                    description: editingSubAssembly.description || '',
                    targetMarginPercent: editingSubAssembly.targetMarginPercent || 30,
                    listPrice: editingSubAssembly.listPrice ? (editingSubAssembly.listPrice / 100).toFixed(2) : '',
                    manualCost: editingSubAssembly.manualCost ? (editingSubAssembly.manualCost / 100).toFixed(2) : '',
                    trackStock: editingSubAssembly.trackStock !== undefined ? editingSubAssembly.trackStock : false,
                    reorderLevel: editingSubAssembly.reorderLevel || 10,
                    labourHours: editingSubAssembly.labourHours || 0,
                    labourMinutes: editingSubAssembly.labourMinutes || 0,
                    locationId: editingSubAssembly.locationId || null
                });
                setCostType(editingSubAssembly.costType || 'CALCULATED');
                setListPriceSource(editingSubAssembly.listPriceSource || 'MANUAL');

                // Load BOM
                try {
                    const bom = await subAssemblyCompositionRepository.getBOMForSubAssembly(editingSubAssembly.id);
                    const bomParts = bom.parts || (Array.isArray(bom) ? bom : []);
                    const bomFasteners = bom.fasteners || [];
                    setBomEntries(bomParts);
                    setBomFastenerEntries(bomFasteners);
                } catch (error) {
                    console.error('Error loading BOM:', error);
                }
            } else {
                setCostType('CALCULATED');
                setListPriceSource('MANUAL');
                setFormData({
                    sku: '',
                    name: '',
                    category: '', // Legacy field
                    categoryId: null,
                    subcategoryId: null,
                    componentCategory: null,
                    description: '',
                    targetMarginPercent: 30,
                    listPrice: '',
                    manualCost: '',
                    trackStock: false,
                    reorderLevel: 10,
                    labourHours: 0,
                    labourMinutes: 0,
                    locationId: null
                });
                setBomEntries([]);
                setBomFastenerEntries([]);
            }
            setError('');
        };

        if (isOpen) {
            loadSubAssemblyData();
        }
    }, [editingSubAssembly, isOpen]);

    // Calculate BOM cost in real-time from current BOM entries
    useEffect(() => {
        const calcBomCost = async () => {
            try {
                let totalCost = 0;

                // Calculate cost for each part in BOM
                for (const entry of bomEntries) {
                    try {
                        const partCost = await getPartCostAtDate(entry.partId, new Date());
                        totalCost += partCost * entry.quantityUsed;
                    } catch (err) {
                        console.error(`Error loading cost for part ${entry.partId}:`, err);
                    }
                }

                // Calculate cost for each fastener in BOM
                for (const entry of bomFastenerEntries) {
                    try {
                        const fastenerCost = await getPartCostAtDate(entry.fastenerId, new Date());
                        totalCost += fastenerCost * entry.quantityUsed;
                    } catch (err) {
                        console.error(`Error loading cost for fastener ${entry.fastenerId}:`, err);
                    }
                }

                // Add labour cost
                if (formData.labourHours > 0 || formData.labourMinutes > 0) {
                    const labourRate = await getLabourRate();
                    const totalMinutes = (formData.labourHours * 60) + formData.labourMinutes;
                    const labourCost = Math.round((totalMinutes / 60) * labourRate);
                    totalCost += labourCost;
                }

                setBomCost(totalCost);
            } catch (err) {
                console.error('Error calculating BOM cost:', err);
                setBomCost(0);
            }
        };

        calcBomCost();
    }, [bomEntries, bomFastenerEntries, formData.labourHours, formData.labourMinutes]);

    // Calculate list price when in CALCULATED mode
    const calculatedListPrice = React.useMemo(() => {
        if (listPriceSource === 'CALCULATED' && bomCost > 0) {
            const marginPercent = parseFloat(formData.targetMarginPercent || 0) / 100;
            // Margin formula: List Price = Cost / (1 - margin%)
            // This ensures the profit is the specified % of the selling price
            if (marginPercent >= 1) {
                return 0; // Invalid: margin can't be 100% or more
            }
            return Math.round(bomCost / (1 - marginPercent));
        }
        return 0;
    }, [listPriceSource, bomCost, formData.targetMarginPercent]);

    const handleAddPart = (partId, quantity) => {
        setBomEntries(prev => [...prev, { partId, quantityUsed: quantity }]);
    };

    const handleRemovePart = (partId) => {
        setBomEntries(prev => prev.filter(e => e.partId !== partId));
    };

    const handleUpdateQuantity = (partId, quantity) => {
        setBomEntries(prev => prev.map(e =>
            e.partId === partId ? { ...e, quantityUsed: quantity } : e
        ));
    };

    const handleAddFastener = (fastenerId, quantity) => {
        setBomFastenerEntries(prev => [...prev, { fastenerId, quantityUsed: quantity }]);
    };

    const handleRemoveFastener = (fastenerId) => {
        setBomFastenerEntries(prev => prev.filter(e => e.fastenerId !== fastenerId));
    };

    const handleUpdateFastenerQuantity = (fastenerId, quantity) => {
        setBomFastenerEntries(prev => prev.map(e =>
            e.fastenerId === fastenerId ? { ...e, quantityUsed: quantity } : e
        ));
    };

    const handleGenerateSKU = async () => {
        if (!formData.categoryId) {
            setError('Please select a category first');
            return;
        }

        setGeneratingSKU(true);
        try {
            const newSKU = await generateNextSubAssemblySKU(formData.categoryId, formData.subcategoryId);
            setFormData(prev => ({ ...prev, sku: newSKU }));
        } catch (err) {
            setError(err.message || 'Failed to generate SKU');
        } finally {
            setGeneratingSKU(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            // Determine list price based on source
            let listPriceValue;
            if (listPriceSource === 'CALCULATED') {
                listPriceValue = calculatedListPrice / 100; // Convert from cents to dollars
            } else {
                listPriceValue = parseFloat(formData.listPrice || '0');
            }
            const listPriceCents = Math.round(listPriceValue * 100);

            const manualCostValue = parseFloat(formData.manualCost || '0');
            const manualCostCents = Math.round(manualCostValue * 100);

            const subAssemblyData = {
                sku: formData.sku.trim(),
                name: formData.name.trim(),
                category: formData.category.trim(), // Legacy field
                categoryId: formData.categoryId,
                subcategoryId: formData.subcategoryId,
                componentCategory: formData.componentCategory,
                description: formData.description.trim(),
                targetMarginPercent: parseFloat(formData.targetMarginPercent || '0'),
                listPrice: listPriceCents,
                listPriceSource: listPriceSource,
                locationId: formData.locationId,
                manualCost: costType === 'MANUAL' ? manualCostCents : 0,
                costType: costType,
                trackStock: formData.trackStock,
                reorderLevel: parseInt(formData.reorderLevel || '0'),
                labourHours: parseInt(formData.labourHours) || 0,
                labourMinutes: parseInt(formData.labourMinutes) || 0
            };

            let subAssemblyId;

            if (editingSubAssembly) {
                // Update existing sub assembly
                await updateSubAssembly(editingSubAssembly.id, subAssemblyData);
                subAssemblyId = editingSubAssembly.id;

                // Update BOM - remove old entries and add new ones
                const existingBOM = await subAssemblyCompositionRepository.getBOMForSubAssembly(subAssemblyId);
                const existingParts = existingBOM.parts || existingBOM; // Handle legacy structure
                const existingFasteners = existingBOM.fasteners || [];

                // Remove parts no longer in BOM
                for (const existing of existingParts) {
                    if (!bomEntries.some(e => e.partId === existing.partId)) {
                        await removePartFromBOM(subAssemblyId, existing.partId);
                    }
                }

                // Add or update parts
                for (const entry of bomEntries) {
                    const exists = existingParts.some(e => e.partId === entry.partId);
                    if (exists) {
                        await updatePartQuantity(subAssemblyId, entry.partId, entry.quantityUsed);
                    } else {
                        await addPartToBOM(subAssemblyId, entry.partId, entry.quantityUsed);
                    }
                }

                // Remove fasteners no longer in BOM
                for (const existing of existingFasteners) {
                    if (!bomFastenerEntries.some(e => e.fastenerId === existing.fastenerId)) {
                        await removeFastenerFromBOM(subAssemblyId, existing.fastenerId);
                    }
                }

                // Add or update fasteners
                for (const entry of bomFastenerEntries) {
                    const exists = existingFasteners.some(e => e.fastenerId === entry.fastenerId);
                    if (exists) {
                        await updateFastenerQuantity(subAssemblyId, entry.fastenerId, entry.quantityUsed);
                    } else {
                        await addFastenerToBOM(subAssemblyId, entry.fastenerId, entry.quantityUsed);
                    }
                }
            } else {
                // Create new sub assembly
                const result = await addSubAssembly(subAssemblyData);
                subAssemblyId = result.id;

                // Add part BOM entries
                for (const entry of bomEntries) {
                    await addPartToBOM(subAssemblyId, entry.partId, entry.quantityUsed);
                }

                // Add fastener BOM entries
                for (const entry of bomFastenerEntries) {
                    await addFastenerToBOM(subAssemblyId, entry.fastenerId, entry.quantityUsed);
                }
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save sub assembly');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <CategoryProvider>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="bg-slate-900 w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                        <h2 className="text-xl font-bold text-white">
                            {editingSubAssembly ? 'Edit Sub Assembly' : 'Add New Sub Assembly'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icons.X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 px-6 pt-0 pb-4 border-b border-slate-700 bg-slate-900 sticky top-[73px] z-10">
                        <button
                            type="button"
                            onClick={() => setActiveTab('details')}
                            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'details'
                                ? 'bg-slate-800 text-white border-b-2 border-cyan-500'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('bom')}
                            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'bom'
                                ? 'bg-slate-800 text-white border-b-2 border-cyan-500'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                        >
                            Bill of Materials
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* DETAILS TAB */}
                        {activeTab === 'details' && (
                            <>
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            SKU <span className="text-red-400">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                required
                                                value={formData.sku}
                                                onChange={(e) => {
                                                    if (editingSubAssembly) {
                                                        if (confirm('WARNING: Changing the SKU of an existing sub assembly can cause data inconsistencies. Are you sure?')) {
                                                            setFormData(prev => ({ ...prev, sku: e.target.value }));
                                                        }
                                                    } else {
                                                        setFormData(prev => ({ ...prev, sku: e.target.value }));
                                                    }
                                                }}
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                placeholder="SA-001"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateSKU}
                                                disabled={generatingSKU || !formData.categoryId}
                                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Auto-generate SKU"
                                            >
                                                {generatingSKU ? (
                                                    <Icons.Loader size={16} className="animate-spin" />
                                                ) : (
                                                    <Icons.RotateCcw size={16} />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {editingSubAssembly
                                                ? '⚠️ SKU is locked after creation - changing it may cause issues'
                                                : 'Auto-generates based on category/subcategory'
                                            }
                                        </p>
                                    </div>

                                    {/* Category Selection */}
                                    <CategorySelect
                                        value={{ categoryId: formData.categoryId, subcategoryId: formData.subcategoryId }}
                                        onChange={(selection) => setFormData(prev => ({
                                            ...prev,
                                            categoryId: selection.categoryId,
                                            subcategoryId: selection.subcategoryId
                                        }))}
                                        required={false}
                                    />
                                </div>

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
                                        placeholder="Motor Mount Assembly"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        rows="2"
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Optional details..."
                                    />
                                </div>

                                {/* Component Category - For Cost Estimator filtering */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Component Category
                                    </label>
                                    <select
                                        value={formData.componentCategory || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, componentCategory: e.target.value || null }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="">None (General Sub-Assembly)</option>
                                        <option value="Weigh Module">Weigh Module</option>
                                        <option value="Billet Weight">Billet Weight</option>
                                        <option value="Speed Sensor">Speed Sensor</option>
                                        <option value="TMD Frame">TMD Frame</option>
                                    </select>
                                    <p className="text-xs text-slate-400 mt-1">
                                        <Icons.Info size={12} className="inline mr-1" />
                                        Select a component type to make this sub-assembly available in the Cost Estimator
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Target Margin (%)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={formData.targetMarginPercent}
                                            onChange={(e) => setFormData(prev => ({ ...prev, targetMarginPercent: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            List Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.listPrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, listPrice: e.target.value }))}
                                            disabled={listPriceSource === 'CALCULATED'}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Calculated Margin Display - Show when manually entering list price */}
                                {listPriceSource === 'MANUAL' && formData.listPrice && parseFloat(formData.listPrice) > 0 && (
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">Calculated Margin:</span>
                                            <span className={`text-lg font-bold ${(() => {
                                                const activeCost = costType === 'CALCULATED' ? bomCost / 100 : parseFloat(formData.manualCost || 0);
                                                const list = parseFloat(formData.listPrice) || 0;
                                                const margin = list === 0 ? 0 : ((list - activeCost) / list * 100);
                                                return margin >= formData.targetMarginPercent ? 'text-emerald-400' : 'text-amber-400';
                                            })()}`}>
                                                {(() => {
                                                    const activeCost = costType === 'CALCULATED' ? bomCost / 100 : parseFloat(formData.manualCost || 0);
                                                    const list = parseFloat(formData.listPrice) || 0;
                                                    if (list === 0) return '0.0%';
                                                    return ((list - activeCost) / list * 100).toFixed(1) + '%';
                                                })()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Based on {costType === 'CALCULATED' ? `BOM cost $${(bomCost / 100).toFixed(2)}` : `manual cost $${parseFloat(formData.manualCost || 0).toFixed(2)}`}
                                        </p>
                                    </div>
                                )}

                                {/* List Price Source Toggle */}
                                <ListPriceToggle
                                    listPriceSource={listPriceSource}
                                    onChange={setListPriceSource}
                                    itemType="sub assembly"
                                />

                                {/* Calculated List Price Display */}
                                {listPriceSource === 'CALCULATED' && (
                                    <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-300">BOM Cost:</span>
                                            <span className="font-mono text-white">${(bomCost / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-300">Target Margin:</span>
                                            <span className="font-mono text-white">{formData.targetMarginPercent}%</span>
                                        </div>
                                        <div className="h-px bg-cyan-500/30"></div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-white">Calculated List Price:</span>
                                            <span className="text-xl font-bold text-cyan-400">
                                                ${(calculatedListPrice / 100).toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            <Icons.Info size={12} className="inline mr-1" />
                                            This price will update automatically when part costs change
                                        </p>
                                    </div>
                                )}

                                {/* Track Stock Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <input
                                        type="checkbox"
                                        id="trackStock"
                                        checked={formData.trackStock}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            // Confirm when unchecking
                                            if (!checked) {
                                                if (confirm('Are you sure you want to stop tracking stock for this sub assembly? This will remove it from stock take and stock overview.')) {
                                                    setFormData(prev => ({ ...prev, trackStock: false }));
                                                }
                                            } else {
                                                setFormData(prev => ({ ...prev, trackStock: true }));
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                    />
                                    <label htmlFor="trackStock" className="text-sm text-slate-300 cursor-pointer">
                                        Track Stock
                                    </label>
                                </div>

                                {/* Reorder Level - Only show if tracking stock */}
                                {formData.trackStock && (
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Reorder Level
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.reorderLevel}
                                            onChange={(e) => setFormData(prev => ({ ...prev, reorderLevel: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {/* BOM TAB */}
                        {activeTab === 'bom' && (
                            <>
                                {/* BOM Editor */}
                                <BOMEditor
                                    bomEntries={bomEntries}
                                    bomFastenerEntries={bomFastenerEntries}
                                    onAddPart={handleAddPart}
                                    onRemovePart={handleRemovePart}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onAddFastener={handleAddFastener}
                                    onRemoveFastener={handleRemoveFastener}
                                    onUpdateFastenerQuantity={handleUpdateFastenerQuantity}
                                />

                                {/* Cost Type Toggle */}
                                <ProductCostToggle
                                    costType={costType}
                                    onChange={setCostType}
                                />

                                {/* Calculated Cost Display - Only shown when Calculated from BOM is selected */}
                                {costType === 'CALCULATED' && bomCost > 0 && (
                                    <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-300">Total Manufacturing Cost:</span>
                                            <span className="text-2xl font-bold text-emerald-400">
                                                ${(bomCost / 100).toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            <Icons.Info size={12} className="inline mr-1" />
                                            Includes parts, fasteners, and labour costs
                                        </p>
                                    </div>
                                )}

                                {/* Manual Cost Input - Only shown when Manual Entry is selected */}
                                {costType === 'MANUAL' && (
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Manual Manufacturing Cost ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.manualCost}
                                            onChange={(e) => setFormData(prev => ({ ...prev, manualCost: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">
                                            Enter the total manufacturing cost for this product
                                        </p>
                                    </div>
                                )}

                                {/* Labour Time */}
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-300 mb-3">
                                        Labour Time
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Hours</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={formData.labourHours}
                                                onChange={(e) => setFormData(prev => ({ ...prev, labourHours: parseInt(e.target.value) || 0 }))}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Minutes</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                step="1"
                                                value={formData.labourMinutes}
                                                onChange={(e) => {
                                                    const mins = parseInt(e.target.value) || 0;
                                                    setFormData(prev => ({ ...prev, labourMinutes: Math.min(59, Math.max(0, mins)) }));
                                                }}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Labour cost calculated at current rate and added to total manufacturing cost
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Actions */}
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
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : (editingSubAssembly ? 'Update Sub Assembly' : 'Add Sub Assembly')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </CategoryProvider>
    );
};
