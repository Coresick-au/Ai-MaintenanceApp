import { useMemo } from 'react';
import { useCategories } from '../../../context/CategoryContext';
import type { CategorySelection } from '../../../types/Category';

interface CategorySelectProps {
    /** Current selected category and subcategory IDs */
    value: CategorySelection;

    /** Callback when selection changes */
    onChange: (value: CategorySelection) => void;

    /** Optional label for the category dropdown */
    categoryLabel?: string;

    /** Optional label for the subcategory dropdown */
    subcategoryLabel?: string;

    /** Whether the component is disabled */
    disabled?: boolean;

    /** Whether category selection is required */
    required?: boolean;

    /** Enable multi-select mode for subcategories */
    multiSelect?: boolean;
}

/**
 * Cascading Category Dropdown Component
 * Provides two-level category selection (Category → Subcategory).
 * Automatically filters subcategories based on selected parent category.
 * Supports both single-select and multi-select modes for subcategories.
 */
export function CategorySelect({
    value,
    onChange,
    categoryLabel = 'Category',
    subcategoryLabel = 'Subcategory',
    disabled = false,
    required = false,
    multiSelect = false
}: CategorySelectProps) {
    const { categories, loading } = useCategories();

    // Filter root categories (parentId === null)
    const rootCategories = useMemo(() => {
        return categories.filter(cat => cat.parentId === null);
    }, [categories]);

    // Filter subcategories based on selected category
    const subcategories = useMemo(() => {
        if (!value.categoryId) return [];
        return categories.filter(cat => cat.parentId === value.categoryId);
    }, [categories, value.categoryId]);

    const handleCategoryChange = (categoryId: string) => {
        onChange({
            categoryId: categoryId || null,
            subcategoryId: multiSelect ? undefined : null,
            subcategoryIds: multiSelect ? [] : undefined
        });
    };

    const handleSubcategoryChange = (subcategoryId: string) => {
        onChange({
            ...value,
            subcategoryId: subcategoryId || null
        });
    };

    const handleSubcategoryToggle = (subcategoryId: string, checked: boolean) => {
        const currentIds = value.subcategoryIds || [];
        const newIds = checked
            ? [...currentIds, subcategoryId]
            : currentIds.filter(id => id !== subcategoryId);

        onChange({
            ...value,
            subcategoryIds: newIds
        });
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    {categoryLabel}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <select
                    value={value.categoryId || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={disabled || loading}
                    required={required}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:border-slate-500 transition-colors"
                >
                    <option value="">Select category...</option>
                    {rootCategories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Subcategory Selection - Single or Multi */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    {subcategoryLabel}
                    {multiSelect && <span className="text-xs text-slate-400 ml-2">(select multiple)</span>}
                </label>

                {multiSelect ? (
                    /* Multi-select with checkboxes */
                    <div className={`bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 max-h-32 overflow-y-auto ${disabled || loading || !value.categoryId || subcategories.length === 0
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                        }`}>
                        {!value.categoryId ? (
                            <div className="text-sm text-slate-400 py-1">Select category first...</div>
                        ) : subcategories.length === 0 ? (
                            <div className="text-sm text-slate-400 py-1">No subcategories available</div>
                        ) : (
                            <div className="space-y-1">
                                {subcategories.map(subcategory => (
                                    <label
                                        key={subcategory.id}
                                        className="flex items-center gap-2 py-1 hover:bg-slate-800 rounded px-2 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(value.subcategoryIds || []).includes(subcategory.id)}
                                            onChange={(e) => handleSubcategoryToggle(subcategory.id, e.target.checked)}
                                            disabled={disabled || loading}
                                            className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                        />
                                        <span className="text-sm text-white">{subcategory.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Single-select dropdown */
                    <select
                        value={value.subcategoryId || ''}
                        onChange={(e) => handleSubcategoryChange(e.target.value)}
                        disabled={disabled || loading || !value.categoryId || subcategories.length === 0}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:border-slate-500 transition-colors"
                    >
                        <option value="">
                            {!value.categoryId
                                ? 'Select category first...'
                                : subcategories.length === 0
                                    ? 'No subcategories available'
                                    : 'Select subcategory (optional)...'}
                        </option>
                        {subcategories.map(subcategory => (
                            <option key={subcategory.id} value={subcategory.id}>
                                {subcategory.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
}
