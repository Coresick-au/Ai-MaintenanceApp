import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { addSupplier, updateSupplier, deleteSupplier } from '../../services/inventoryService';
import { useCategories } from '../../context/CategoryContext';

export const SupplierManager = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [deletingSupplier, setDeletingSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const { categories } = useCategories();

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'suppliers'),
            (snapshot) => {
                const suppliersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSuppliers(suppliersList);
                setLoading(false);
            },
            (error) => {
                console.error('[SupplierManager] Error fetching suppliers:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Helper to get category name by ID
    const getCategoryName = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : '';
    };

    // Sort suppliers
    const sortedSuppliers = useMemo(() => {
        let sorted = [...suppliers];

        sorted.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Handle null/undefined values
            if (!aVal && bVal) return 1;
            if (aVal && !bVal) return -1;
            if (!aVal && !bVal) return 0;

            // Special handling for category count
            if (sortConfig.key === 'categoryCount') {
                aVal = (a.categoryIds?.length || 0) + (a.subcategoryIds?.length || 0);
                bVal = (b.categoryIds?.length || 0) + (b.subcategoryIds?.length || 0);
            }

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [suppliers, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <Icons.ChevronsUpDown size={14} className="text-slate-500" />;
        return sortConfig.direction === 'ascending'
            ? <Icons.ChevronUp size={14} className="text-cyan-400" />
            : <Icons.ChevronDown size={14} className="text-cyan-400" />;
    };

    const handleAdd = () => {
        setEditingSupplier(null);
        setIsModalOpen(true);
    };

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteSupplier(deletingSupplier.id);
            setDeletingSupplier(null);
        } catch (error) {
            console.error('Error deleting supplier:', error);
            alert('Failed to delete supplier. Please try again.');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-400">Loading suppliers...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Suppliers</h2>
                    <p className="text-sm text-slate-400 mt-1">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Icons.Plus size={18} />
                    Add Supplier
                </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-2">
                                    Supplier Name {getSortIcon('name')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('contactName')}>
                                <div className="flex items-center gap-2">
                                    Contact {getSortIcon('contactName')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('email')}>
                                <div className="flex items-center gap-2">
                                    Email {getSortIcon('email')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('phone')}>
                                <div className="flex items-center gap-2">
                                    Phone {getSortIcon('phone')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('categoryCount')}>
                                <div className="flex items-center gap-2">
                                    Categories {getSortIcon('categoryCount')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('defaultLeadTimeDays')}>
                                <div className="flex items-center justify-center gap-2">
                                    Lead Time {getSortIcon('defaultLeadTimeDays')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {sortedSuppliers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                                    No suppliers yet. Add your first supplier to get started.
                                </td>
                            </tr>
                        ) : (
                            sortedSuppliers.map(supplier => (
                                <tr
                                    key={supplier.id}
                                    className="hover:bg-slate-700/50 transition-colors"
                                >
                                    <td className="px-4 py-3 text-white font-medium">{supplier.name}</td>
                                    <td className="px-4 py-3 text-slate-300">{supplier.contactName || '-'}</td>
                                    <td className="px-4 py-3 text-slate-300">{supplier.email || '-'}</td>
                                    <td className="px-4 py-3 text-slate-300">{supplier.phone || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {/* Main Categories */}
                                            {supplier.categoryIds && supplier.categoryIds.length > 0 ? (
                                                supplier.categoryIds.slice(0, 2).map(catId => {
                                                    const category = categories.find(c => c.id === catId);
                                                    return category ? (
                                                        <span
                                                            key={catId}
                                                            className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded text-xs"
                                                        >
                                                            {category.name}
                                                        </span>
                                                    ) : null;
                                                })
                                            ) : null}
                                            {/* Subcategories */}
                                            {supplier.subcategoryIds && supplier.subcategoryIds.length > 0 ? (
                                                supplier.subcategoryIds.slice(0, 2).map(subId => {
                                                    const subcategory = categories.find(c => c.id === subId);
                                                    return subcategory ? (
                                                        <span
                                                            key={subId}
                                                            className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs"
                                                        >
                                                            {subcategory.name}
                                                        </span>
                                                    ) : null;
                                                })
                                            ) : null}
                                            {/* Show count if more categories/subcategories */}
                                            {((supplier.categoryIds?.length || 0) + (supplier.subcategoryIds?.length || 0) > 4) && (
                                                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-xs">
                                                    +{(supplier.categoryIds?.length || 0) + (supplier.subcategoryIds?.length || 0) - 4}
                                                </span>
                                            )}
                                            {/* Show message if no categories */}
                                            {(!supplier.categoryIds || supplier.categoryIds.length === 0) && (!supplier.subcategoryIds || supplier.subcategoryIds.length === 0) && (
                                                <span className="text-slate-500 text-xs italic">No categories</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                                            {supplier.defaultLeadTimeDays} days
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(supplier)}
                                                className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                                title="Edit Supplier"
                                            >
                                                <Icons.Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingSupplier(supplier)}
                                                className="p-1.5 rounded hover:bg-slate-600 text-red-400 transition-colors"
                                                title="Delete Supplier"
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

            {isModalOpen && (
                <SupplierModal
                    supplier={editingSupplier}
                    categories={categories}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deletingSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-slate-900 w-full max-w-md rounded-xl border border-red-500/30 shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Icons.AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-2">Delete Supplier?</h3>
                                    <p className="text-slate-300 text-sm mb-1">
                                        Are you sure you want to delete <strong>{deletingSupplier.name}</strong>?
                                    </p>
                                    <p className="text-red-400 text-sm mt-3">This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setDeletingSupplier(null)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    Delete Supplier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SupplierModal = ({ supplier, categories, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        defaultLeadTimeDays: 14,
        categoryIds: [],
        subcategoryIds: [],
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Get subcategories based on selected categories
    const availableSubcategories = useMemo(() => {
        if (!formData.categoryIds || formData.categoryIds.length === 0) return [];
        return categories.filter(cat =>
            cat.parentId && formData.categoryIds.includes(cat.parentId)
        );
    }, [categories, formData.categoryIds]);

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name,
                contactName: supplier.contactName || '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                defaultLeadTimeDays: supplier.defaultLeadTimeDays,
                categoryIds: supplier.categoryIds || [],
                subcategoryIds: supplier.subcategoryIds || [],
                notes: supplier.notes || ''
            });
        }
    }, [supplier]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate categories
        if (!formData.categoryIds || formData.categoryIds.length === 0) {
            setError('Please select at least one category');
            return;
        }

        setSaving(true);

        try {
            const supplierData = {
                ...formData,
                defaultLeadTimeDays: parseInt(formData.defaultLeadTimeDays)
            };

            if (supplier) {
                await updateSupplier(supplier.id, supplierData);
            } else {
                await addSupplier(supplierData);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    const handleCategoryToggle = (categoryId, isChecked) => {
        setFormData(prev => {
            const newCategoryIds = isChecked
                ? [...prev.categoryIds, categoryId]
                : prev.categoryIds.filter(id => id !== categoryId);

            // If unchecking a category, also remove its subcategories
            let newSubcategoryIds = prev.subcategoryIds;
            if (!isChecked) {
                const subcatsToRemove = categories
                    .filter(cat => cat.parentId === categoryId)
                    .map(cat => cat.id);
                newSubcategoryIds = prev.subcategoryIds.filter(id => !subcatsToRemove.includes(id));
            }

            return {
                ...prev,
                categoryIds: newCategoryIds,
                subcategoryIds: newSubcategoryIds
            };
        });
    };

    const handleSubcategoryToggle = (subcategoryId, isChecked) => {
        setFormData(prev => ({
            ...prev,
            subcategoryIds: isChecked
                ? [...prev.subcategoryIds, subcategoryId]
                : prev.subcategoryIds.filter(id => id !== subcategoryId)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-white">
                        {supplier ? 'Edit Supplier' : 'Add Supplier'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Icons.X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Supplier Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Acme Parts Co."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Contact Name
                            </label>
                            <input
                                type="text"
                                value={formData.contactName}
                                onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="John Smith"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Default Lead Time (days) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.defaultLeadTimeDays}
                                onChange={(e) => setFormData(prev => ({ ...prev, defaultLeadTimeDays: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="contact@supplier.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="07 1234 5678"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Categories <span className="text-red-400">*</span>
                        </label>
                        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 max-h-64 overflow-y-auto">
                            {categories.length === 0 ? (
                                <p className="text-slate-400 text-sm">No categories available</p>
                            ) : (
                                <div className="space-y-2">
                                    {categories
                                        .filter(category => !category.parentId) // Only show main categories
                                        .map(category => (
                                            <label
                                                key={category.id}
                                                className="flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.categoryIds.includes(category.id)}
                                                    onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                                />
                                                <span className="text-sm text-white">{category.name}</span>
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            <Icons.Info size={12} className="inline mr-1" />
                            Select main categories this supplier can provide
                        </p>
                    </div>

                    {/* Subcategories Section */}
                    {formData.categoryIds && formData.categoryIds.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Subcategories (Optional)
                            </label>
                            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 max-h-48 overflow-y-auto">
                                {availableSubcategories.length === 0 ? (
                                    <p className="text-slate-400 text-sm">
                                        No subcategories available for selected categories
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {availableSubcategories.map(subcategory => (
                                            <label
                                                key={subcategory.id}
                                                className="flex items-center gap-2 p-2 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.subcategoryIds.includes(subcategory.id)}
                                                    onChange={(e) => handleSubcategoryToggle(subcategory.id, e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                                />
                                                <span className="text-sm text-white">{subcategory.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">
                                <Icons.Info size={12} className="inline mr-1" />
                                {availableSubcategories.length > 0
                                    ? 'Select specific subcategories (based on selected main categories)'
                                    : 'The selected categories do not have any subcategories defined'
                                }
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows="2"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            placeholder="Optional notes..."
                        />
                    </div>

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
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (supplier ? 'Update' : 'Add Supplier')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
