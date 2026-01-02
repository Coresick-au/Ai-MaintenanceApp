import { useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useCategories } from '../../../context/CategoryContext';
import { createCategory, updateCategory, deleteCategory, checkCategoryUsage } from '../../../services/categoryService';
import { CategoryTree } from './CategoryTree';
import { ConfirmationDialog } from './ConfirmationDialog';
import type { Category } from '../../../types/Category';

interface EditState {
    categoryId: string | null;
    name: string;
}

interface DeleteState {
    category: Category;
    usageCount: number;
    collections?: string[];
}

/**
 * Category Manager Component
 * Main container for category management with inline add/edit/delete operations.
 */
export function CategoryManager() {
    const { categories, loading, error } = useCategories();
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isAddingRoot, setIsAddingRoot] = useState(false);
    const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editState, setEditState] = useState<EditState | null>(null);
    const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState('');

    // Usage counts map (could be enhanced with checkCategoryUsage in the future)
    const [usageCounts] = useState<Record<string, number>>({});

    const handleAddRootCategory = () => {
        setIsAddingRoot(true);
        setNewCategoryName('');
        setValidationError('');
    };

    const handleAddSubcategory = (parentCategory: Category) => {
        setAddingSubcategoryTo(parentCategory.id);
        setNewCategoryName('');
        setValidationError('');
    };

    const handleSaveNewCategory = async () => {
        if (!newCategoryName.trim()) {
            setValidationError('Category name cannot be empty');
            return;
        }

        // Check for duplicate names within the same parent (allow same names under different parents)
        const isDuplicate = categories.some(
            cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase() &&
                cat.parentId === addingSubcategoryTo
        );
        if (isDuplicate) {
            const parentName = addingSubcategoryTo
                ? categories.find(c => c.id === addingSubcategoryTo)?.name
                : 'root level';
            setValidationError(`A category with this name already exists under "${parentName}"`);
            return;
        }

        setIsSaving(true);
        setValidationError('');

        try {
            await createCategory({
                name: newCategoryName.trim(),
                parentId: addingSubcategoryTo
            });

            // Reset state
            setIsAddingRoot(false);
            setAddingSubcategoryTo(null);
            setNewCategoryName('');
        } catch (error) {
            console.error('Error creating category:', error);
            setValidationError(error instanceof Error ? error.message : 'Failed to create category');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelNewCategory = () => {
        setIsAddingRoot(false);
        setAddingSubcategoryTo(null);
        setNewCategoryName('');
        setValidationError('');
    };

    const handleEditCategory = (category: Category) => {
        setEditState({
            categoryId: category.id,
            name: category.name
        });
        setValidationError('');
    };

    const handleSaveEdit = async () => {
        if (!editState) return;

        if (!editState.name.trim()) {
            setValidationError('Category name cannot be empty');
            return;
        }

        // Find the category being edited to get its parentId
        const editingCategory = categories.find(cat => cat.id === editState.categoryId);

        // Check for duplicate names within the same parent (excluding current category)
        const isDuplicate = categories.some(
            cat => cat.id !== editState.categoryId &&
                cat.name.toLowerCase() === editState.name.trim().toLowerCase() &&
                cat.parentId === editingCategory?.parentId
        );
        if (isDuplicate) {
            const parentName = editingCategory?.parentId
                ? categories.find(c => c.id === editingCategory.parentId)?.name
                : 'root level';
            setValidationError(`A category with this name already exists under "${parentName}"`);
            return;
        }

        setIsSaving(true);
        setValidationError('');

        try {
            await updateCategory(editState.categoryId!, {
                name: editState.name.trim()
            });

            setEditState(null);
        } catch (error) {
            console.error('Error updating category:', error);
            setValidationError(error instanceof Error ? error.message : 'Failed to update category');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditState(null);
        setValidationError('');
    };

    const handleDeleteCategory = async (category: Category) => {
        // Check usage before showing confirmation dialog
        try {
            const usage = await checkCategoryUsage(category.id);
            setDeleteState({
                category,
                usageCount: usage.count,
                collections: usage.collections
            });
        } catch (error) {
            console.error('Error checking category usage:', error);
            setValidationError(error instanceof Error ? error.message : 'Failed to check category usage');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteState) return;

        setIsSaving(true);

        try {
            await deleteCategory(deleteState.category.id);
            setDeleteState(null);
            setSelectedCategory(null);
        } catch (error) {
            console.error('Error deleting category:', error);
            setValidationError(error instanceof Error ? error.message : 'Failed to delete category');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelDelete = () => {
        setDeleteState(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-400">Loading categories...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                <p className="font-medium">Error loading categories</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Category Management</h2>
                <button
                    onClick={handleAddRootCategory}
                    disabled={isAddingRoot}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Category
                </button>
            </div>

            {/* Validation Error */}
            {validationError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    {validationError}
                </div>
            )}

            {/* Add Root Category Input */}
            {isAddingRoot && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg border border-cyan-500/30">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNewCategory();
                            if (e.key === 'Escape') handleCancelNewCategory();
                        }}
                        placeholder="Enter category name..."
                        autoFocus
                        disabled={isSaving}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSaveNewCategory}
                        disabled={isSaving}
                        className="p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white rounded transition-colors"
                        title="Save"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleCancelNewCategory}
                        disabled={isSaving}
                        className="p-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}


            {/* Add Subcategory Input (inline when addingSubcategoryTo is set) */}
            {addingSubcategoryTo && (
                <div className="mb-4 ml-6 flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg border border-cyan-500/30">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNewCategory();
                            if (e.key === 'Escape') handleCancelNewCategory();
                        }}
                        placeholder="Enter subcategory name..."
                        autoFocus
                        disabled={isSaving}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSaveNewCategory}
                        disabled={isSaving}
                        className="p-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                        title="Save"
                    >
                        <Save className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleCancelNewCategory}
                        disabled={isSaving}
                        className="p-1 bg-slate-600 hover:bg-slate-500 text-white rounded"
                        title="Cancel"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Edit Category Input (inline when editState is set) */}
            {editState && (
                <div className="mb-4 flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg border border-blue-500/30">
                    <input
                        type="text"
                        value={editState.name}
                        onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                        disabled={isSaving}
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                        title="Save"
                    >
                        <Save className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="p-1 bg-slate-600 hover:bg-slate-500 text-white rounded"
                        title="Cancel"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Category Tree with integrated CRUD operations */}
            <CategoryTree
                categories={categories}
                selectedCategoryId={selectedCategory?.id}
                onSelectCategory={setSelectedCategory}
                usageCounts={usageCounts}
                onAddSubcategory={handleAddSubcategory}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleDeleteCategory}
            />

            {/* Delete Confirmation Dialog */}
            {deleteState && (
                <ConfirmationDialog
                    title={deleteState.usageCount > 0 ? 'Cannot Delete Category' : 'Delete Category?'}
                    message={
                        deleteState.usageCount > 0
                            ? `'${deleteState.category.name}' is currently used by ${deleteState.usageCount} inventory item(s)${deleteState.collections ? ` (${deleteState.collections.join(', ')})` : ''}. Remove all references before deleting.`
                            : `Are you sure you want to delete '${deleteState.category.name}'? This action cannot be undone.`
                    }
                    type={deleteState.usageCount > 0 ? 'warning' : 'confirm'}
                    confirmText="Delete"
                    onConfirm={deleteState.usageCount === 0 ? handleConfirmDelete : undefined}
                    onCancel={handleCancelDelete}
                    loading={isSaving}
                />
            )}
        </div>
    );
}
