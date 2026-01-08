import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addFastenerToCatalog, updateFastener, filterSuppliersByCategories } from '../../services/inventoryService';
import { generateNextFastenerSKU } from '../../utils/skuGenerator';
import { CategorySelect } from './categories/CategorySelect';
import { LocationSelect } from './LocationSelect';
import { CategoryProvider } from '../../context/CategoryContext';
import { PartPricingTab } from './PartPricingTab';
import { ListPriceToggle } from './ListPriceToggle';
import { getLowestSupplierPrice } from '../../services/partPricingService';

export const FastenerCatalogModal = ({ isOpen, onClose, editingFastener = null }) => {
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [activeTab, setActiveTab] = useState('details');
    const [lowestSupplierPrice, setLowestSupplierPrice] = useState(null);
    const [listPriceSource, setListPriceSource] = useState('MANUAL');
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '', // Legacy field
        categoryId: null,
        subcategoryId: null,
        suppliers: [],
        description: '',
        material: '', // Optional material field
        costPrice: '',
        costPriceSource: 'MANUAL',
        listPrice: '',
        targetMarginPercent: 30,
        isSerialized: false,
        isSaleable: false,
        trackStock: false,
        reorderLevel: 10,
        locationId: null
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Preserve list price and margin when toggling saleable
    const [preservedListPrice, setPreservedListPrice] = useState('');
    const [preservedTargetMargin, setPreservedTargetMargin] = useState(30);

    // Load categories from Firestore (filter for fastener categories)
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'part_categories'), (snap) => {
            const categoriesList = snap.docs
                .map(doc => doc.data())
                .filter(cat => cat.type === 'fastener'); // Filter only fastener categories
            categoriesList.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(categoriesList);

            // Set default category if none selected
            if (!formData.category && categoriesList.length > 0) {
                setFormData(prev => ({ ...prev, category: categoriesList[0].name }));
            }
        });

        return () => unsubscribe();
    }, [formData.category]);

    // Load suppliers from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'suppliers'), (snap) => {
            const suppliersList = snap.docs.map(doc => doc.data());
            suppliersList.sort((a, b) => a.name.localeCompare(b.name));
            setSuppliers(suppliersList);
        });

        return () => unsubscribe();
    }, []);

    // Filter suppliers by fastener's categories
    useEffect(() => {
        const categoryIds = [];
        if (formData.categoryId) categoryIds.push(formData.categoryId);
        if (formData.subcategoryId) categoryIds.push(formData.subcategoryId);

        const filtered = filterSuppliersByCategories(suppliers, categoryIds);
        setFilteredSuppliers(filtered);
    }, [suppliers, formData.categoryId, formData.subcategoryId]);

    useEffect(() => {
        if (editingFastener) {
            setFormData({
                sku: editingFastener.sku,
                name: editingFastener.name,
                category: editingFastener.category, // Legacy field
                categoryId: editingFastener.categoryId || null,
                subcategoryId: editingFastener.subcategoryId || null,
                // Migration: convert old supplier string to array
                suppliers: editingFastener.suppliers || (editingFastener.supplier ? [editingFastener.supplier] : []),
                description: editingFastener.description || '',
                material: editingFastener.material || '',
                costPrice: (editingFastener.costPrice / 100).toFixed(2),
                costPriceSource: editingFastener.costPriceSource || 'MANUAL',
                listPrice: (editingFastener.listPrice / 100).toFixed(2),
                targetMarginPercent: editingFastener.targetMarginPercent,
                isSerialized: editingFastener.isSerialized,
                isSaleable: editingFastener.isSaleable || false,
                trackStock: editingFastener.trackStock !== undefined ? editingFastener.trackStock : false,
                reorderLevel: editingFastener.reorderLevel,
                locationId: editingFastener.locationId || null
            });
            setListPriceSource(editingFastener.listPriceSource || 'MANUAL');
        } else {
            setFormData({
                sku: '',
                name: '',
                category: categories.length > 0 ? categories[0].name : '', // Legacy field
                categoryId: null,
                subcategoryId: null,
                suppliers: [],
                description: '',
                material: '',
                costPrice: '',
                costPriceSource: 'MANUAL',
                listPrice: '',
                targetMarginPercent: 30,
                isSerialized: false,
                isSaleable: false,
                trackStock: false,
                reorderLevel: 10,
                locationId: null
            });
            setListPriceSource('MANUAL');
        }
        setError('');
        setNewCategoryName('');
        setActiveTab('details'); // Reset to details tab
    }, [editingFastener, isOpen, categories]);

    // Load lowest supplier price when editing
    useEffect(() => {
        const loadLowestPrice = async () => {
            if (editingFastener?.id) {
                try {
                    const validSuppliers = editingFastener.suppliers || [];
                    const lowest = await getLowestSupplierPrice(editingFastener.id, new Date(), validSuppliers);
                    setLowestSupplierPrice(lowest);
                } catch (err) {
                    console.error('Error loading lowest supplier price:', err);
                }
            } else {
                setLowestSupplierPrice(null);
            }
        };

        if (isOpen) {
            loadLowestPrice();
        }
    }, [editingFastener?.id, isOpen, formData.suppliers]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await addCategory(newCategoryName, 'fastener'); // Add type parameter
            setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
            setNewCategoryName('');
            setShowAddCategory(false);
        } catch (err) {
            setError(err.message || 'Failed to add category');
        }
    };

    const handleGenerateSKU = async () => {
        if (!formData.categoryId) {
            setError('Please select a category first');
            return;
        }

        setGeneratingSKU(true);
        try {
            const newSKU = await generateNextFastenerSKU(formData.categoryId, formData.subcategoryId);
            setFormData(prev => ({ ...prev, sku: newSKU }));
        } catch (err) {
            setError(err.message || 'Failed to generate SKU');
        } finally {
            setGeneratingSKU(false);
        }
    };

    const handleAddSupplier = () => {
        if (!selectedSupplier) return;

        // Prevent duplicates
        const currentSuppliers = formData.suppliers || [];
        if (currentSuppliers.includes(selectedSupplier)) {
            setError(`"${selectedSupplier}" is already added`);
            setTimeout(() => setError(''), 3000);
            return;
        }

        setFormData(prev => ({
            ...prev,
            suppliers: [...(prev.suppliers || []), selectedSupplier]
        }));
        setSelectedSupplier('');
        setError('');
    };

    const handleRemoveSupplier = (supplierToRemove) => {
        setFormData(prev => ({
            ...prev,
            suppliers: (prev.suppliers || []).filter(s => s !== supplierToRemove)
        }));
    };

    // Calculate list price when in CALCULATED mode for saleable fasteners
    const calculatedListPrice = useMemo(() => {
        if (formData.isSaleable && listPriceSource === 'CALCULATED') {
            // Use active cost price based on source
            let costPrice;
            if (formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice) {
                costPrice = lowestSupplierPrice.costPrice; // Already in cents
            } else {
                costPrice = parseFloat(formData.costPrice || 0) * 100; // Convert to cents
            }

            const marginPercent = parseFloat(formData.targetMarginPercent || 0) / 100;

            if (marginPercent >= 1 || costPrice === 0) {
                return 0;
            }

            return Math.round(costPrice / (1 - marginPercent));
        }
        return 0;
    }, [formData.isSaleable, listPriceSource, formData.costPrice, formData.costPriceSource, formData.targetMarginPercent, lowestSupplierPrice]);

    // Auto-generate SKU when category changes (only for new fasteners)
    useEffect(() => {
        if (!editingFastener && formData.category && !formData.sku) {
            handleGenerateSKU();
        }
    }, [formData.category]);

    const handleSubmit = async () => {
        setError('');
        setSaving(true);

        try {
            // Start with base fastener data
            // NOTE: costPriceSource is NOT included here because it's managed independently
            // in the PartPricingTab to avoid overwriting changes with stale formData
            const fastenerData = {
                sku: formData.sku.trim(),
                name: formData.name.trim(),
                category: formData.category.trim(), // Legacy field
                categoryId: formData.categoryId,
                subcategoryId: formData.subcategoryId,
                suppliers: formData.suppliers || [],
                description: formData.description.trim(),
                material: formData.material || '',
                locationId: formData.locationId,
                listPriceSource: formData.isSaleable ? listPriceSource : 'MANUAL',
                targetMarginPercent: parseFloat(formData.targetMarginPercent || '0'),
                isSerialized: formData.isSerialized,
                isSaleable: formData.isSaleable,
                trackStock: formData.trackStock,
                reorderLevel: parseInt(formData.reorderLevel || '0')
            };

            // For new fasteners, initialize costPriceSource to MANUAL and set initial cost price
            if (!editingFastener) {
                fastenerData.costPriceSource = 'MANUAL';
                // Convert dollars to cents for new fasteners
                const costPriceValue = parseFloat(formData.costPrice || '0');
                fastenerData.costPrice = Math.round(costPriceValue * 100);
            }
            // NOTE: When editing, we DO NOT update costPrice here because it's managed 
            // independently in the PartPricingTab based on costPriceSource setting

            // Calculate list price based on source
            if (formData.isSaleable && listPriceSource === 'CALCULATED') {
                fastenerData.listPrice = calculatedListPrice;
            } else {
                const listPriceValue = parseFloat(formData.listPrice || '0');
                fastenerData.listPrice = Math.round(listPriceValue * 100);
            }

            if (editingFastener) {
                await updateFastener(editingFastener.id, fastenerData);
            } else {
                await addFastenerToCatalog(fastenerData);
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save fastener');
        } finally {
            setSaving(false);
        }
    };

    const calculatedMargin = useMemo(() => {
        // Determine active cost based on cost source
        const activeCost = formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice
            ? lowestSupplierPrice.costPrice / 100  // Convert from cents to dollars
            : parseFloat(formData.costPrice) || 0;

        const list = parseFloat(formData.listPrice) || 0;
        if (list === 0) return 0;
        return ((list - activeCost) / list * 100).toFixed(1);
    }, [formData.costPrice, formData.listPrice, formData.costPriceSource, lowestSupplierPrice]);

    if (!isOpen) return null;

    return (
        <CategoryProvider>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                        <div className="flex items-center justify-between p-6 pb-0">
                            <h2 className="text-xl font-bold text-white">
                                {editingFastener ? 'Edit Fastener' : 'Add New Fastener'}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Icons.X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        {editingFastener && (
                            <div className="flex gap-2 px-6 pt-4">
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
                                    onClick={() => setActiveTab('pricing')}
                                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'pricing'
                                        ? 'bg-slate-800 text-white border-b-2 border-cyan-500'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                        }`}
                                >
                                    Pricing
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'details' ? (
                        /* Form */
                        <form className="p-6 space-y-4">{error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                            <div className="grid grid-cols-2 gap-4">
                                {/* SKU */}
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
                                                if (editingFastener) {
                                                    // Show confirmation when trying to edit existing SKU
                                                    if (confirm('WARNING: Changing the SKU of an existing item can cause data inconsistencies. Are you sure you want to proceed?')) {
                                                        setFormData(prev => ({ ...prev, sku: e.target.value }));
                                                    }
                                                } else {
                                                    setFormData(prev => ({ ...prev, sku: e.target.value }));
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="BOLT-001"
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
                                        {editingFastener
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
                                    required={true}
                                />
                            </div>

                            {/* Name */}
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
                                    placeholder="M8 x 50mm Hex Bolt"
                                />
                            </div>

                            {/* Suppliers */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Suppliers
                                </label>
                                <div className="space-y-3">
                                    {/* Add Supplier */}
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedSupplier}
                                            onChange={(e) => setSelectedSupplier(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="">-- Select Supplier --</option>
                                            {filteredSuppliers.map(supplier => (
                                                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={handleAddSupplier}
                                            disabled={!selectedSupplier}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Icons.Plus size={16} />
                                            Add
                                        </button>
                                    </div>

                                    {/* Suppliers List */}
                                    {formData.suppliers?.length > 0 && (
                                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <p className="text-xs text-slate-400 mb-2">Added Suppliers:</p>
                                            <div className="space-y-1">
                                                {formData.suppliers.map((supplier, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                                        <span className="text-sm text-white">{supplier}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSupplier(supplier)}
                                                            className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                            title="Remove supplier"
                                                        >
                                                            <Icons.X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
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

                            {/* Material */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Material
                                </label>
                                <select
                                    value={formData.material}
                                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="">-- None --</option>
                                    <option value="Stainless 304">Stainless 304</option>
                                    <option value="Stainless 316">Stainless 316</option>
                                    <option value="Galvanised">Galvanised</option>
                                    <option value="Zinc">Zinc</option>
                                    <option value="Aluminium">Aluminium</option>
                                    <option value="Plastic">Plastic</option>
                                    <option value="Nylon">Nylon</option>
                                </select>
                                <p className="text-xs text-slate-400 mt-1">Optional material specification</p>
                            </div>

                            {/* Location */}
                            <LocationSelect
                                value={formData.locationId}
                                onChange={(locationId) => setFormData(prev => ({ ...prev, locationId }))}
                                required={false}
                            />

                            {/* List Price - Only show if saleable */}
                            {formData.isSaleable && (
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
                            )}

                            {/* List Price Source Toggle - Only show if saleable */}
                            {formData.isSaleable && (
                                <ListPriceToggle
                                    listPriceSource={listPriceSource}
                                    onChange={setListPriceSource}
                                    itemType="part"
                                />
                            )}

                            {/* Calculated List Price Display - Only show if saleable and CALCULATED */}
                            {formData.isSaleable && listPriceSource === 'CALCULATED' && (
                                <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-300">
                                            Cost Price ({formData.costPriceSource === 'SUPPLIER_LOWEST' ? 'Supplier Lowest' : 'Manual'}):
                                        </span>
                                        <span className="font-mono text-white">
                                            ${(() => {
                                                if (formData.costPriceSource === 'SUPPLIER_LOWEST' && lowestSupplierPrice) {
                                                    return (lowestSupplierPrice.costPrice / 100).toFixed(2);
                                                }
                                                return formData.costPrice || '0.00';
                                            })()}
                                        </span>
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
                                        This price will update automatically when cost price changes
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2"></div>

                                {/* Target Margin - Only show if saleable */}
                                {formData.isSaleable && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Target Margin
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="1"
                                                value={formData.targetMarginPercent}
                                                onChange={(e) => setFormData(prev => ({ ...prev, targetMarginPercent: e.target.value }))}
                                                className="w-full pr-7 pl-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Calculated Margin Display - Only show if saleable */}
                            {formData.isSaleable && (
                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Calculated Margin:</span>
                                        <span className={`text-lg font-bold ${parseFloat(calculatedMargin) >= formData.targetMarginPercent
                                            ? 'text-emerald-400'
                                            : 'text-amber-400'
                                            }`}>
                                            {calculatedMargin}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                {/* Serialized Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <input
                                        type="checkbox"
                                        id="isSerialized"
                                        checked={formData.isSerialized}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isSerialized: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                    />
                                    <label htmlFor="isSerialized" className="text-sm text-slate-300 cursor-pointer">
                                        Track by Serial Number
                                    </label>
                                </div>

                                {/* Saleable Toggle */}
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <input
                                        type="checkbox"
                                        id="isSaleable"
                                        checked={formData.isSaleable}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            if (!checked) {
                                                // Unchecking: Preserve values then clear
                                                setPreservedListPrice(formData.listPrice);
                                                setPreservedTargetMargin(formData.targetMarginPercent);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    isSaleable: false,
                                                    listPrice: '',
                                                    targetMarginPercent: 30
                                                }));
                                            } else {
                                                // Checking: Restore preserved values
                                                setFormData(prev => ({
                                                    ...prev,
                                                    isSaleable: true,
                                                    listPrice: preservedListPrice,
                                                    targetMarginPercent: preservedTargetMargin
                                                }));
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                                    />
                                    <label htmlFor="isSaleable" className="text-sm text-slate-300 cursor-pointer">
                                        Saleable to Customers
                                    </label>
                                </div>

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
                                                if (confirm('Are you sure you want to stop tracking stock for this fastener? This will remove it from stock take and hide reorder level.')) {
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
                                    <div>
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
                            </div>
                        </form>
                    ) : (
                        /* Pricing Tab */
                        <PartPricingTab
                            part={editingFastener}
                            suppliers={formData.suppliers || []}
                        />
                    )}

                    {/* Action Buttons - Always visible at bottom */}
                    <div className="flex justify-end gap-3 p-6 pt-4 border-t border-slate-700 bg-slate-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : (editingFastener ? 'Update Fastener' : 'Add Fastener')}
                        </button>
                    </div>
                </div>
            </div>
        </CategoryProvider>
    );
};
