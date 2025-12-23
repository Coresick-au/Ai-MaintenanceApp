import { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { useCategories } from '../../../context/CategoryContext';

interface FilterPanelProps {
    /** Callback when Apply is clicked with selected filter IDs */
    onApply: (categoryIds: string[]) => void;

    /** Callback to close the panel */
    onClose: () => void;

    /** Currently active filter IDs */
    activeFilters?: string[];
}

/**
 * Category Filter Panel Component
 * Provides Excel-like multi-select filtering for categories and subcategories.
 */
export function FilterPanel({ onApply, onClose, activeFilters = [] }: FilterPanelProps) {
    const { categories } = useCategories();
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(activeFilters);
    const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);

    // Filter root categories (parentId === null)
    const rootCategories = useMemo(() => {
        return categories.filter(cat => cat.parentId === null);
    }, [categories]);

    // Filter subcategories based on selected root categories
    const availableSubcategories = useMemo(() => {
        if (selectedCategoryIds.length === 0) {
            // If no categories selected, show all subcategories
            return categories.filter(cat => cat.parentId !== null);
        }
        // Show only subcategories of selected categories
        return categories.filter(cat =>
            cat.parentId !== null && selectedCategoryIds.includes(cat.parentId)
        );
    }, [categories, selectedCategoryIds]);

    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategoryIds(prev => {
            const newSelection = prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId];
            return newSelection;
        });
    };

    const handleSubcategoryToggle = (subcategoryId: string) => {
        setSelectedSubcategoryIds(prev => {
            const newSelection = prev.includes(subcategoryId)
                ? prev.filter(id => id !== subcategoryId)
                : [...prev, subcategoryId];
            return newSelection;
        });
    };

    const handleClearAll = () => {
        setSelectedCategoryIds([]);
        setSelectedSubcategoryIds([]);
    };

    const handleApplyClick = () => {
        // Combine both category and subcategory IDs
        const allSelectedIds = [...selectedCategoryIds, ...selectedSubcategoryIds];
        onApply(allSelectedIds);
    };

    const activeFilterCount = selectedCategoryIds.length + selectedSubcategoryIds.length;

    return (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/50" onClick={onClose}>
            <div
                className="bg-slate-800 w-full max-w-sm h-full shadow-2xl border-l border-slate-700 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 z-10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-lg font-semibold text-white">Filter by Category</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-700 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    {activeFilterCount > 0 && (
                        <div className="text-sm text-cyan-400">
                            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                        </div>
                    )}
                </div>

                {/* Filter Sections */}
                <div className="p-4 space-y-6">
                    {/* Root Categories */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-300">Categories</label>
                            {selectedCategoryIds.length > 0 && (
                                <button
                                    onClick={() => setSelectedCategoryIds([])}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {rootCategories.map(category => (
                                <label
                                    key={category.id}
                                    className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedCategoryIds.includes(category.id)}
                                        onChange={() => handleCategoryToggle(category.id)}
                                        className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-800"
                                    />
                                    <span className="text-sm text-slate-200">{category.name}</span>
                                </label>
                            ))}
                            {rootCategories.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-4">No categories available</p>
                            )}
                        </div>
                    </div>

                    {/* Subcategories */}
                    {availableSubcategories.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-slate-300">Subcategories</label>
                                {selectedSubcategoryIds.length > 0 && (
                                    <button
                                        onClick={() => setSelectedSubcategoryIds([])}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {availableSubcategories.map(subcategory => (
                                    <label
                                        key={subcategory.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSubcategoryIds.includes(subcategory.id)}
                                            onChange={() => handleSubcategoryToggle(subcategory.id)}
                                            className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-800"
                                        />
                                        <span className="text-sm text-slate-200">{subcategory.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex gap-3">
                    <button
                        onClick={handleClearAll}
                        disabled={activeFilterCount === 0}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={handleApplyClick}
                        className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
