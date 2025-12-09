import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addPartToCatalog, updatePart } from '../../services/inventoryService';
import { addCategory } from '../../services/categoryService';
import { generateNextSKU, checkSKUExists } from '../../utils/skuGenerator';

export const PartCatalogModal = ({ isOpen, onClose, editingPart = null }) => {
    const [categories, setCategories] = useState([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [generatingSKU, setGeneratingSKU] = useState(false);
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: '',
        description: '',
        costPrice: '',
        listPrice: '',
        targetMarginPercent: 30,
        isSerialized: false,
        reorderLevel: 10
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Load categories from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'part_categories'), (snap) => {
            const categoriesList = snap.docs.map(doc => doc.data());
            categoriesList.sort((a, b) => a.name.localeCompare(b.name));
            setCategories(categoriesList);

            // Set default category if none selected
            if (!formData.category && categoriesList.length > 0) {
                setFormData(prev => ({ ...prev, category: categoriesList[0].name }));
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (editingPart) {
            setFormData({
                sku: editingPart.sku,
                name: editingPart.name,
                category: editingPart.category,
                description: editingPart.description || '',
                costPrice: (editingPart.costPrice / 100).toFixed(2),
                listPrice: (editingPart.listPrice / 100).toFixed(2),
                targetMarginPercent: editingPart.targetMarginPercent,
                isSerialized: editingPart.isSerialized,
                reorderLevel: editingPart.reorderLevel
            });
        } else {
            setFormData({
                sku: '',
                name: '',
                category: categories.length > 0 ? categories[0].name : '',
                description: '',
                costPrice: '',
                listPrice: '',
                targetMarginPercent: 30,
                isSerialized: false,
                reorderLevel: 10
            });
        }
        setError('');
        setShowAddCategory(false);
        setNewCategoryName('');
    }, [editingPart, isOpen, categories]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await addCategory(newCategoryName);
            setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
            setNewCategoryName('');
            setShowAddCategory(false);
        } catch (err) {
            setError(err.message || 'Failed to add category');
        }
    };

    const handleGenerateSKU = async () => {
        if (!formData.category) {
            setError('Please select a category first');
            return;
        }

        setGeneratingSKU(true);
        try {
            const newSKU = await generateNextSKU(formData.category);
            setFormData(prev => ({ ...prev, sku: newSKU }));
        } catch (err) {
            setError(err.message || 'Failed to generate SKU');
        } finally {
            setGeneratingSKU(false);
        }
    };

    // Auto-generate SKU when category changes (only for new parts)
    useEffect(() => {
        if (!editingPart && formData.category && !formData.sku) {
            handleGenerateSKU();
        }
    }, [formData.category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            // Check for duplicate SKU
            const skuExists = await checkSKUExists(formData.sku.trim(), editingPart?.id);
            if (skuExists) {
                setError(`SKU "${formData.sku}" already exists. Please use a different SKU.`);
                setSaving(false);
                return;
            }

            // Convert dollars to cents, handle empty/optional values
            const costPriceValue = parseFloat(formData.costPrice || '0');
            const listPriceValue = parseFloat(formData.listPrice || '0');

            const costPriceCents = Math.round(costPriceValue * 100);
            const listPriceCents = Math.round(listPriceValue * 100);

            const partData = {
                sku: formData.sku.trim(),
                name: formData.name.trim(),
                category: formData.category,
                description: formData.description.trim(),
                costPrice: costPriceCents,
                listPrice: listPriceCents,
                targetMarginPercent: parseFloat(formData.targetMarginPercent || '0'),
                isSerialized: formData.isSerialized,
                reorderLevel: parseInt(formData.reorderLevel || '0')
            };

            if (editingPart) {
                await updatePart(editingPart.id, partData);
            } else {
                await addPartToCatalog(partData);
            }

            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save part');
        } finally {
            setSaving(false);
        }
    };

    const calculatedMargin = useMemo(() => {
        const cost = parseFloat(formData.costPrice) || 0;
        const list = parseFloat(formData.listPrice) || 0;
        if (list === 0) return 0;
        return ((list - cost) / list * 100).toFixed(1);
    }, [formData.costPrice, formData.listPrice]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-white">
                        {editingPart ? 'Edit Part' : 'Add New Part'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <Icons.X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
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
                                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="INT-001"
                                />
                                <button
                                    type="button"
                                    onClick={handleGenerateSKU}
                                    disabled={generatingSKU || !formData.category}
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
                                Auto-generates based on category
                            </p>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Category <span className="text-red-400">*</span>
                            </label>
                            {showAddCategory ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="New category name"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                    >
                                        <Icons.Check size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCategory(false)}
                                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        <Icons.X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCategory(true)}
                                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                                        title="Add new category"
                                    >
                                        <Icons.Plus size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
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
                            placeholder="Schenck Integrator"
                        />
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

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Cost Price ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.costPrice}
                                    onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="0.00"
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
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Target Margin */}
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
                    </div>

                    {/* Calculated Margin Display */}
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

                    <div className="grid grid-cols-2 gap-4">
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

                        {/* Reorder Level */}
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
                    </div>

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
                            {saving ? 'Saving...' : (editingPart ? 'Update Part' : 'Add Part')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
