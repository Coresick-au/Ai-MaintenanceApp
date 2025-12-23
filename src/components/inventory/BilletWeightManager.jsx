import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import {
    addBilletWeight,
    updateBilletWeight,
    deleteBilletWeight,
    MATERIAL_TYPES,
    getBilletWeightCategory,
    formatCurrency,
    filterSuppliersByCategories
} from '../../services/specializedComponentsService';
import { CategorySelect } from './categories/CategorySelect';
import { CategoryProvider } from '../../context/CategoryContext';
import { useCategories } from '../../context/CategoryContext';

export const BilletWeightManager = () => {
    const [billetWeights, setBilletWeights] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingWeight, setEditingWeight] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [sortField, setSortField] = useState('effectiveDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const { categories } = useCategories();
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [formData, setFormData] = useState({
        weightKg: 0,
        materialType: 'STAINLESS_STEEL',
        categoryId: null,
        subcategoryId: null,
        suppliers: [],
        costPrice: '',
        setupCost: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Load billet weights from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'billet_weights_cost_history'),
            (snapshot) => {
                const weights = snapshot.docs.map(doc => doc.data());
                weights.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
                setBilletWeights(weights);
            },
            (error) => {
                console.error('Error loading billet weights:', error);
                setError('Failed to load billet weights');
            }
        );

        return () => unsubscribe();
    }, []);

    // Load suppliers from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'suppliers'), (snap) => {
            const suppliersList = snap.docs.map(doc => doc.data());
            suppliersList.sort((a, b) => a.name.localeCompare(b.name));
            setSuppliers(suppliersList);
        });

        return () => unsubscribe();
    }, []);

    // Filter suppliers by component's categories
    useEffect(() => {
        const categoryIds = [];
        if (formData.categoryId) categoryIds.push(formData.categoryId);
        if (formData.subcategoryId) categoryIds.push(formData.subcategoryId);

        const filtered = filterSuppliersByCategories(suppliers, categoryIds);
        setFilteredSuppliers(filtered);
    }, [suppliers, formData.categoryId, formData.subcategoryId]);

    const handleAddSupplier = () => {
        if (!selectedSupplier) return;

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

    const handleOpenForm = (weight = null) => {
        if (weight) {
            setEditingWeight(weight);
            setFormData({
                weightKg: weight.weightKg,
                materialType: weight.materialType,
                categoryId: weight.categoryId || null,
                subcategoryId: weight.subcategoryId || null,
                suppliers: weight.suppliers || [],
                costPrice: (weight.costPrice / 100).toFixed(2),
                setupCost: weight.setupCost ? (weight.setupCost / 100).toFixed(2) : '',
                effectiveDate: weight.effectiveDate,
                notes: weight.notes || ''
            });
        } else {
            setEditingWeight(null);
            setFormData({
                weightKg: 0,
                materialType: 'STAINLESS_STEEL',
                categoryId: null,
                subcategoryId: null,
                suppliers: [],
                costPrice: '',
                setupCost: '',
                effectiveDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
        }
        setIsFormOpen(true);
        setError('');
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingWeight(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const costPriceCents = Math.round(parseFloat(formData.costPrice) * 100);
            const setupCostCents = formData.setupCost ? Math.round(parseFloat(formData.setupCost) * 100) : 0;

            const weightData = {
                weightKg: parseFloat(formData.weightKg),
                materialType: formData.materialType,
                categoryId: formData.categoryId,
                subcategoryId: formData.subcategoryId,
                suppliers: formData.suppliers || [],
                costPrice: costPriceCents,
                setupCost: setupCostCents,
                effectiveDate: formData.effectiveDate,
                notes: formData.notes.trim()
            };

            if (editingWeight) {
                await updateBilletWeight(editingWeight.id, weightData);
            } else {
                await addBilletWeight(weightData);
            }

            handleCloseForm();
        } catch (err) {
            setError(err.message || 'Failed to save billet weight');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (weightId) => {
        if (!confirm('Are you sure you want to delete this billet weight entry?')) return;

        try {
            await deleteBilletWeight(weightId);
        } catch (err) {
            setError(err.message || 'Failed to delete billet weight');
        }
    };

    const getCategoryName = (categoryId) => {
        if (!categoryId) return null;
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : null;
    };


    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortedWeights = () => {
        const sorted = [...billetWeights].sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case 'weightKg':
                    aVal = a.weightKg;
                    bVal = b.weightKg;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                case 'materialType':
                    aVal = MATERIAL_TYPES[a.materialType];
                    bVal = MATERIAL_TYPES[b.materialType];
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case 'costPrice':
                    aVal = a.costPrice;
                    bVal = b.costPrice;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                case 'effectiveDate':
                    aVal = new Date(a.effectiveDate);
                    bVal = new Date(b.effectiveDate);
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                default:
                    return 0;
            }
        });
        return sorted;
    };

    const SortableHeader = ({ field, children }) => (
        <th
            className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:bg-slate-700/50 transition-colors"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortField === field && (
                    sortDirection === 'asc' ?
                        <Icons.ChevronUp size={14} /> :
                        <Icons.ChevronDown size={14} />
                )}
            </div>
        </th>
    );

    return (
        <CategoryProvider>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Billet Weights</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Track historical cost data for billet weights (&lt;250kg and ≥250kg)
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenForm()}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Icons.Plus size={20} />
                        Add Billet Weight
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800 border-b border-slate-700">
                                <tr>
                                    <SortableHeader field="weightKg">Weight (kg)</SortableHeader>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Size</th>
                                    <SortableHeader field="materialType">Material</SortableHeader>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Item Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Suppliers</th>
                                    <SortableHeader field="costPrice">Cost Price</SortableHeader>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Setup Cost</th>
                                    <SortableHeader field="effectiveDate">Effective Date</SortableHeader>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {getSortedWeights().length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                                            No billet weights added yet. Click "Add Billet Weight" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    getSortedWeights().map(weight => (
                                        <tr key={weight.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-white font-medium">{weight.weightKg}kg</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs ${getBilletWeightCategory(weight.weightKg) === 'Small (<250kg)'
                                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                    }`}>
                                                    {getBilletWeightCategory(weight.weightKg)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{MATERIAL_TYPES[weight.materialType]}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {getCategoryName(weight.categoryId) || getCategoryName(weight.subcategoryId) ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {getCategoryName(weight.categoryId) && (
                                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs">
                                                                {getCategoryName(weight.categoryId)}
                                                            </span>
                                                        )}
                                                        {getCategoryName(weight.subcategoryId) && (
                                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-xs">
                                                                {getCategoryName(weight.subcategoryId)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {weight.suppliers && weight.suppliers.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {weight.suppliers.map((supplier, idx) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-xs">
                                                                {supplier}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-emerald-400">{formatCurrency(weight.costPrice)}</td>
                                            <td className="px-4 py-3 text-sm font-mono text-slate-300">
                                                {weight.setupCost ? formatCurrency(weight.setupCost) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{weight.effectiveDate}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenForm(weight)}
                                                        className="p-1.5 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(weight.id)}
                                                        className="p-1.5 hover:bg-slate-700 rounded text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Form Modal */}
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="border-b border-slate-700 p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white">
                                        {editingWeight ? 'Edit Billet Weight' : 'Add Billet Weight'}
                                    </h3>
                                    <button
                                        onClick={handleCloseForm}
                                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <Icons.X size={20} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Weight */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Weight (kg) <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.1"
                                            value={formData.weightKg}
                                            onChange={(e) => setFormData(prev => ({ ...prev, weightKg: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="250"
                                        />
                                        {formData.weightKg > 0 && (
                                            <p className="text-xs text-slate-400 mt-1">
                                                Category: {getBilletWeightCategory(parseFloat(formData.weightKg))}
                                            </p>
                                        )}
                                    </div>

                                    {/* Material Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Material Type <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.materialType}
                                            onChange={(e) => setFormData(prev => ({ ...prev, materialType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="STAINLESS_STEEL">{MATERIAL_TYPES.STAINLESS_STEEL}</option>
                                            <option value="GALVANISED">{MATERIAL_TYPES.GALVANISED}</option>
                                        </select>
                                    </div>
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

                                {/* Suppliers */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Suppliers
                                    </label>
                                    <div className="space-y-3">
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

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Cost Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Cost Price ($) <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    {/* Setup Cost */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Setup Cost ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.setupCost}
                                            onChange={(e) => setFormData(prev => ({ ...prev, setupCost: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Effective Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Effective Date <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.effectiveDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        rows="3"
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Optional notes..."
                                        maxLength={500}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Saving...' : (editingWeight ? 'Update' : 'Add')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </CategoryProvider>
    );
};
