import { useState, useMemo, useEffect } from 'react';
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
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);

    // Initialize state from activeFilters prop safely
    // We need to do this in an effect because categories might load asynchronously
    useEffect(() => {
        if (categories.length > 0) {
            const roots: string[] = [];
            const subs: string[] = [];

            activeFilters.forEach(id => {
                const cat = categories.find(c => c.id === id);
                if (cat) {
                    if (cat.parentId === null) roots.push(id);
                    else subs.push(id);
                }
            });

            setSelectedCategoryIds(roots);
            setSelectedSubcategoryIds(subs);
        }
    }, [categories, activeFilters]);

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

    // Group available subcategories by name to deduplicate in UI
    const subcategoriesByName = useMemo(() => {
        const groups: Record<string, string[]> = {};
        availableSubcategories.forEach(sub => {
            if (!groups[sub.name]) groups[sub.name] = [];
            groups[sub.name].push(sub.id);
        });
        return groups;
    }, [availableSubcategories]);

    // Get sorted unique subcategory names
    const sortedSubNames = useMemo(() => {
        return Object.keys(subcategoriesByName).sort();
    }, [subcategoriesByName]);

    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategoryIds(prev => {
            const newSelection = prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId];
            return newSelection;
        });
    };

    const handleSubcategoryNameToggle = (name: string) => {
        const idsForName = subcategoriesByName[name] || [];

        setSelectedSubcategoryIds(prev => {
            // Check if all IDs for this name are currently selected
            // (or if at least one is selected? Logic: treating name as the entity implies yes/no)
            // Let's strictly toggle: 
            // If ALL are selected -> Deselect ALL
            // Otherwise -> Select ALL (including missing ones)

            const allSelected = idsForName.every(id => prev.includes(id));

            if (allSelected) {
                // Remove all IDs associated with this name
                return prev.filter(id => !idsForName.includes(id));
            } else {
                // Add all IDs associated with this name (filtering out ones already there to be safe)
                const toAdd = idsForName.filter(id => !prev.includes(id));
                return [...prev, ...toAdd];
            }
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

    // Helper to check if a subcategory name group is selected
    const isSubcategoryNameSelected = (name: string) => {
        const ids = subcategoriesByName[name] || [];
        return ids.length > 0 && ids.every(id => selectedSubcategoryIds.includes(id));
    };

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
                    {sortedSubNames.length > 0 && (
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
                                {sortedSubNames.map(name => (
                                    <label
                                        key={name}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSubcategoryNameSelected(name)}
                                            onChange={() => handleSubcategoryNameToggle(name)}
                                            className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-800"
                                        />
                                        <span className="text-sm text-slate-200">{name}</span>
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
