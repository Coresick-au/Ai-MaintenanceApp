import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { addProduct, updateProduct, addPartToBOM, removePartFromBOM, updatePartQuantity, addFastenerToBOM, removeFastenerFromBOM, updateFastenerQuantity, addSubAssemblyToBOM, removeSubAssemblyFromBOM, updateSubAssemblyQuantity } from '../../services/productService';
import { generateNextProductSKU } from '../../utils/skuGenerator';
import { CategorySelect } from './categories/CategorySelect';
import { LocationSelect } from './LocationSelect';
import { CategoryProvider } from '../../context/CategoryContext';
import { BOMEditor } from './BOMEditor';
import { ProductCostToggle } from './ProductCostToggle';
import { ListPriceToggle } from './ListPriceToggle';
import { productCompositionRepository } from '../../repositories';
import { getSubAssemblyCostAtDate, getPartCostAtDate } from '../../services/costingService';
import { getLabourRate } from '../../services/settingsService';

/**
 * Product Catalog Modal for creating/editing products
 * @description Modal component for product CRUD operations with BOM management
 * and cost type selection.
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} [props.editingProduct] - Product being edited (null for new product)
 * @returns {JSX.Element} Rendered modal
 */
export const ProductCatalogModal = ({ isOpen, onClose, onSuccess, editingProduct = null }) => {
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '', // Legacy field
        categoryId: null,
        subcategoryId: null,
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
    const [bomSubAssemblyEntries, setBomSubAssemblyEntries] = useState([]);
    const [costType, setCostType] = useState('CALCULATED');
    const [listPriceSource, setListPriceSource] = useState('MANUAL');
    const [bomCost, setBomCost] = useState(0);
    const [activeTab, setActiveTab] = useState('details');
    const [saving, setSaving] = useState(false);
    const [generatingSKU, setGeneratingSKU] = useState(false);
    const [error, setError] = useState('');

    // Load product data when editing
    useEffect(() => {
        const loadProductData = async () => {
            if (editingProduct) {
                setFormData({
                    sku: editingProduct.sku,
                    name: editingProduct.name,
                    category: editingProduct.category || '', // Legacy field
                    categoryId: editingProduct.categoryId || null,
                    subcategoryId: editingProduct.subcategoryId || null,
                    description: editingProduct.description || '',
                    targetMarginPercent: editingProduct.targetMarginPercent || 30,
                    listPrice: editingProduct.listPrice ? (editingProduct.listPrice / 100).toFixed(2) : '',
                    manualCost: editingProduct.manualCost ? (editingProduct.manualCost / 100).toFixed(2) : '',
                    trackStock: editingProduct.trackStock !== undefined ? editingProduct.trackStock : false,
                    reorderLevel: editingProduct.reorderLevel || 10,
                    labourHours: editingProduct.labourHours || 0,
                    labourMinutes: editingProduct.labourMinutes || 0,
                    locationId: editingProduct.locationId || null
                });
                setCostType(editingProduct.costType || 'CALCULATED');
                setListPriceSource(editingProduct.listPriceSource || 'MANUAL');

                // Load BOM
                try {
                    const bom = await productCompositionRepository.getBOMForProduct(editingProduct.id);
                    const bomParts = bom.parts || (Array.isArray(bom) ? bom : []);
                    const bomFasteners = bom.fasteners || [];
                    const bomSubAssemblies = bom.subAssemblies || [];
                    setBomEntries(bomParts);
                    setBomFastenerEntries(bomFasteners);
                    setBomSubAssemblyEntries(bomSubAssemblies);
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
                setBomSubAssemblyEntries([]);
            }
            setError('');
        };

        if (isOpen) {
            loadProductData();
        }
    }, [editingProduct, isOpen]);

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

                // Calculate cost for each sub assembly in BOM
                for (const entry of bomSubAssemblyEntries) {
                    try {
                        const subAssemblyCost = await getSubAssemblyCostAtDate(entry.subAssemblyId, new Date());
                        totalCost += subAssemblyCost * entry.quantityUsed;
                    } catch (err) {
                        console.error(`Error loading cost for sub assembly ${entry.subAssemblyId}:`, err);
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
    }, [bomEntries, bomFastenerEntries, bomSubAssemblyEntries, formData.labourHours, formData.labourMinutes]);

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

    const handleAddSubAssembly = (subAssemblyId, quantity) => {
        setBomSubAssemblyEntries(prev => [...prev, { subAssemblyId, quantityUsed: quantity }]);
    };

    const handleRemoveSubAssembly = (subAssemblyId) => {
        setBomSubAssemblyEntries(prev => prev.filter(e => e.subAssemblyId !== subAssemblyId));
    };

    const handleUpdateSubAssemblyQuantity = (subAssemblyId, quantity) => {
        setBomSubAssemblyEntries(prev => prev.map(e =>
            e.subAssemblyId === subAssemblyId ? { ...e, quantityUsed: quantity } : e
        ));
    };

    const handleGenerateSKU = async () => {
        if (!formData.categoryId) {
            setError('Please select a category first');
            return;
        }

        setGeneratingSKU(true);
        try {
            const newSKU = await generateNextProductSKU(formData.categoryId, formData.subcategoryId);
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

            const productData = {
                sku: formData.sku.trim(),
                name: formData.name.trim(),
                category: formData.category.trim(), // Legacy field
                categoryId: formData.categoryId,
                subcategoryId: formData.subcategoryId,
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

            let productId;

            if (editingProduct) {
                // Update existing product
                await updateProduct(editingProduct.id, productData);
                productId = editingProduct.id;

                // Update BOM - remove old entries and add new ones
                const existingBOM = await productCompositionRepository.getBOMForProduct(productId);
                const existingParts = existingBOM.parts || existingBOM; // Handle legacy structure
                const existingFasteners = existingBOM.fasteners || [];

                // Remove parts no longer in BOM
                for (const existing of existingParts) {
                    if (!bomEntries.some(e => e.partId === existing.partId)) {
                        await removePartFromBOM(productId, existing.partId);
                    }
                }

                // Add or update parts
                for (const entry of bomEntries) {
                    const exists = existingParts.some(e => e.partId === entry.partId);
                    if (exists) {
                        await updatePartQuantity(productId, entry.partId, entry.quantityUsed);
                    } else {
                        await addPartToBOM(productId, entry.partId, entry.quantityUsed);
                    }
                }

                // Remove fasteners no longer in BOM
                for (const existing of existingFasteners) {
                    if (!bomFastenerEntries.some(e => e.fastenerId === existing.fastenerId)) {
                        await removeFastenerFromBOM(productId, existing.fastenerId);
                    }
                }

                // Add or update fasteners
                for (const entry of bomFastenerEntries) {
                    const exists = existingFasteners.some(e => e.fastenerId === entry.fastenerId);
                    if (exists) {
                        await updateFastenerQuantity(productId, entry.fastenerId, entry.quantityUsed);
                    } else {
                        await addFastenerToBOM(productId, entry.fastenerId, entry.quantityUsed);
                    }
                }

                // Get existing sub assemblies from BOM
                const existingSubAssemblies = existingBOM.subAssemblies || [];

                // Remove sub assemblies no longer in BOM
                for (const existing of existingSubAssemblies) {
                    if (!bomSubAssemblyEntries.some(e => e.subAssemblyId === existing.subAssemblyId)) {
                        await removeSubAssemblyFromBOM(productId, existing.subAssemblyId);
                    }
                }

                // Add or update sub assemblies
                for (const entry of bomSubAssemblyEntries) {
                    const exists = existingSubAssemblies.some(e => e.subAssemblyId === entry.subAssemblyId);
                    if (exists) {
                        await updateSubAssemblyQuantity(productId, entry.subAssemblyId, entry.quantityUsed);
                    } else {
                        await addSubAssemblyToBOM(productId, entry.subAssemblyId, entry.quantityUsed);
                    }
                }
            } else {
                // Create new product
                const result = await addProduct(productData);
                productId = result.id;

                // Add part BOM entries
                for (const entry of bomEntries) {
                    await addPartToBOM(productId, entry.partId, entry.quantityUsed);
                }

                // Add fastener BOM entries
                for (const entry of bomFastenerEntries) {
                    await addFastenerToBOM(productId, entry.fastenerId, entry.quantityUsed);
                }

                // Add sub assembly BOM entries
                for (const entry of bomSubAssemblyEntries) {
                    await addSubAssemblyToBOM(productId, entry.subAssemblyId, entry.quantityUsed);
                }
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save product');
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
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
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
                                                    if (editingProduct) {
                                                        if (confirm('WARNING: Changing the SKU of an existing product can cause data inconsistencies. Are you sure?')) {
                                                            setFormData(prev => ({ ...prev, sku: e.target.value }));
                                                        }
                                                    } else {
                                                        setFormData(prev => ({ ...prev, sku: e.target.value }));
                                                    }
                                                }}
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                placeholder="PROD-001"
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
                                            {editingProduct
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
                                        placeholder="Conveyor Assembly XL"
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
                                    itemType="product"
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
                                                if (confirm('Are you sure you want to stop tracking stock for this product? This will remove it from stock take and stock overview.')) {
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
                                    bomSubAssemblyEntries={bomSubAssemblyEntries}
                                    onAddPart={handleAddPart}
                                    onRemovePart={handleRemovePart}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onAddFastener={handleAddFastener}
                                    onRemoveFastener={handleRemoveFastener}
                                    onUpdateFastenerQuantity={handleUpdateFastenerQuantity}
                                    onAddSubAssembly={handleAddSubAssembly}
                                    onRemoveSubAssembly={handleRemoveSubAssembly}
                                    onUpdateSubAssemblyQuantity={handleUpdateSubAssemblyQuantity}
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
                                {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </CategoryProvider>
    );
};
