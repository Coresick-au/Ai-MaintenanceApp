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
}

/**
 * Cascading Category Dropdown Component
 * Provides two-level category selection (Category → Subcategory).
 * Automatically filters subcategories based on selected parent category.
 */
export function CategorySelect({
    value,
    onChange,
    categoryLabel = 'Category',
    subcategoryLabel = 'Subcategory',
    disabled = false,
    required = false
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
            subcategoryId: null // Reset subcategory when category changes
        });
    };

    const handleSubcategoryChange = (subcategoryId: string) => {
        onChange({
            ...value,
            subcategoryId: subcategoryId || null
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

            {/* Subcategory Dropdown */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    {subcategoryLabel}
                </label>
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
            </div>
        </div>
    );
}
