import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { updateCategory, deleteCategory, getCategoryUsageCount } from '../../services/categoryService';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import { Icons } from '../../constants/icons';

export const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [categoryUsage, setCategoryUsage] = useState({});
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const tableRef = React.useRef(null);
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([300, 150, 150, 100]);

    // Real-time listener for categories
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'part_categories'),
            (snapshot) => {
                const cats = snapshot.docs.map(doc => doc.data());
                setCategories(cats);
                setLoading(false);

                // Load usage counts for all categories
                loadUsageCounts(cats);
            },
            (error) => {
                console.error('[CategoryManager] Error fetching categories:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const loadUsageCounts = async (cats) => {
        const usage = {};
        for (const cat of cats) {
            usage[cat.name] = await getCategoryUsageCount(cat.name);
        }
        setCategoryUsage(usage);
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setEditName(category.name);
        setError('');
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditName('');
        setError('');
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) {
            setError('Category name cannot be empty');
            return;
        }

        // Check if name already exists within the same parent (excluding current category)
        // Allow same names under different parents
        const nameExists = categories.some(
            cat => cat.name.toLowerCase() === editName.trim().toLowerCase()
                && cat.id !== editingCategory.id
                && cat.parentId === editingCategory.parentId // Only check within same parent
        );

        if (nameExists) {
            const parentName = editingCategory.parentId
                ? categories.find(c => c.id === editingCategory.parentId)?.name
                : 'root level';
            setError(`A category with this name already exists under "${parentName}"`);
            return;
        }

        setSaving(true);
        setError('');

        try {
            await updateCategory(editingCategory.id, editName.trim(), editingCategory.name);
            setEditingCategory(null);
            setEditName('');
        } catch (err) {
            setError(err.message || 'Failed to update category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category) => {
        const usageCount = categoryUsage[category.name] || 0;

        if (usageCount > 0) {
            alert(`Cannot delete "${category.name}" because ${usageCount} part${usageCount !== 1 ? 's are' : ' is'} using it. Please reassign those parts first.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
            return;
        }

        setSaving(true);
        setError('');

        try {
            await deleteCategory(category.id);
        } catch (err) {
            setError(err.message || 'Failed to delete category');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading categories...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center">
            <div className="w-full max-w-fit space-y-4">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-white">Category Management</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Edit or delete part categories. Categories in use cannot be deleted.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                    <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                        <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 relative" style={{ width: `${columnWidths[0]}px` }}>
                                    <div className="column-content">Category Name</div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(0, e)} onDoubleClick={() => autoFitColumn(0, tableRef)} onClick={(e) => e.stopPropagation()} />
                                </th>
                                <th className="px-4 py-3 text-center relative" style={{ width: `${columnWidths[1]}px` }}>
                                    <div className="column-content">Parts Using</div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(1, e)} onDoubleClick={() => autoFitColumn(1, tableRef)} onClick={(e) => e.stopPropagation()} />
                                </th>
                                <th className="px-4 py-3 text-center relative" style={{ width: `${columnWidths[2]}px` }}>
                                    <div className="column-content">Type</div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} />
                                </th>
                                <th className="px-4 py-3 text-center relative" style={{ width: `${columnWidths[3]}px` }}>
                                    <div className="column-content">Actions</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                                        No categories found. Initialize the system to create default categories.
                                    </td>
                                </tr>
                            ) : (
                                categories.map(category => (
                                    <tr key={category.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {editingCategory?.id === category.id ? (
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-white font-medium">{category.name}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${(categoryUsage[category.name] || 0) > 0
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-slate-700 text-slate-400'
                                                }`}>
                                                {categoryUsage[category.name] || 0} part{(categoryUsage[category.name] || 0) !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {category.isDefault ? (
                                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium border border-purple-500/30">
                                                    Default
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs font-medium">
                                                    Custom
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingCategory?.id === category.id ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        disabled={saving}
                                                        className="p-1.5 rounded hover:bg-emerald-600 bg-emerald-500 text-white transition-colors disabled:opacity-50"
                                                        title="Save"
                                                    >
                                                        <Icons.Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        disabled={saving}
                                                        className="p-1.5 rounded hover:bg-slate-600 bg-slate-700 text-white transition-colors disabled:opacity-50"
                                                        title="Cancel"
                                                    >
                                                        <Icons.X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(category)}
                                                        className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                                        title="Edit Category"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category)}
                                                        disabled={(categoryUsage[category.name] || 0) > 0}
                                                        className="p-1.5 rounded hover:bg-slate-600 text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={(categoryUsage[category.name] || 0) > 0 ? 'Cannot delete - parts are using this category' : 'Delete Category'}
                                                    >
                                                        <Icons.Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
