import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react';
import type { Category, CategoryTreeNode } from '../../../types/Category';

interface CategoryTreeProps {
    /** All categories from context */
    categories: Category[];

    /** Callback when a category is selected */
    onSelectCategory?: (category: Category) => void;

    /** Currently selected category ID */
    selectedCategoryId?: string | null;

    /** Optional usage counts map for status badges */
    usageCounts?: Record<string, number>;

    /** Callback when adding a new subcategory */
    onAddSubcategory?: (parentCategory: Category) => void;

    /** Callback when editing a category */
    onEditCategory?: (category: Category) => void;

    /** Callback when deleting a category */
    onDeleteCategory?: (category: Category) => void;
}

/**
 * Builds a hierarchical tree structure from flat category array.
 * @param categories - Flat array of categories
 * @returns Array of root-level CategoryTreeNode objects with nested children
 */
function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootCategories: CategoryTreeNode[] = [];

    // Initialize all categories as tree nodes
    categories.forEach(category => {
        categoryMap.set(category.id, {
            ...category,
            children: [],
            isExpanded: false,
            isInUse: false,
            usageCount: 0
        });
    });

    // Build parent-child relationships
    categories.forEach(category => {
        const node = categoryMap.get(category.id)!;

        if (category.parentId === null) {
            // Root category
            rootCategories.push(node);
        } else {
            // Child category - add to parent's children
            const parent = categoryMap.get(category.parentId);
            if (parent) {
                parent.children.push(node);
            } else {
                // Orphaned category (parent not found) - treat as root
                rootCategories.push(node);
            }
        }
    });

    return rootCategories;
}

/**
 * Recursive Category Tree Node Component
 */
interface TreeNodeProps {
    node: CategoryTreeNode;
    level: number;
    selectedCategoryId?: string | null;
    onSelectCategory?: (category: Category) => void;
    onToggleExpand: (categoryId: string) => void;
    usageCount?: number;
    onAddSubcategory?: (parentCategory: Category) => void;
    onEditCategory?: (category: Category) => void;
    onDeleteCategory?: (category: Category) => void;
}

function TreeNode({
    node,
    level,
    selectedCategoryId,
    onSelectCategory,
    onToggleExpand,
    usageCount = 0,
    onAddSubcategory,
    onEditCategory,
    onDeleteCategory
}: TreeNodeProps) {
    const hasChildren = node.children.length > 0;
    const isSelected = selectedCategoryId === node.id;
    const isInUse = usageCount > 0;

    return (
        <div className="select-none">
            {/* Category Row */}
            <div
                className={`
          group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
          transition-colors duration-150
          ${isSelected
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'hover:bg-slate-700/50 text-slate-200'
                    }
        `}
                style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
                onClick={() => onSelectCategory?.(node)}
            >
                {/* Expand/Collapse Icon */}
                {hasChildren ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(node.id);
                        }}
                        className="flex-shrink-0 p-0.5 hover:bg-slate-600/50 rounded transition-colors"
                        aria-label={node.isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {node.isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                ) : (
                    <div className="w-5" /> // Spacer for alignment
                )}

                {/* Category Name */}
                <span className="flex-1 text-sm font-medium">
                    {node.name}
                </span>

                {/* Action Buttons (visible on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onAddSubcategory && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddSubcategory(node);
                            }}
                            className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-cyan-400"
                            title="Add Subcategory"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                    {onEditCategory && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditCategory(node);
                            }}
                            className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-blue-400"
                            title="Edit"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    )}
                    {onDeleteCategory && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCategory(node);
                            }}
                            className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Status Badge (Usage Indicator) */}
                {isInUse && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {usageCount} {usageCount === 1 ? 'item' : 'items'}
                    </span>
                )}
            </div>

            {/* Children (Recursive) */}
            {hasChildren && node.isExpanded && (
                <div className="mt-1">
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedCategoryId={selectedCategoryId}
                            onSelectCategory={onSelectCategory}
                            onToggleExpand={onToggleExpand}
                            usageCount={0}
                            onAddSubcategory={onAddSubcategory}
                            onEditCategory={onEditCategory}
                            onDeleteCategory={onDeleteCategory}
                        />
                    ))}</div>
            )}
        </div>
    );
}

/**
 * Category Tree Component
 * Displays categories in a hierarchical tree structure with progressive disclosure.
 * Supports expand/collapse, selection, and usage indicators.
 */
export function CategoryTree({
    categories,
    onSelectCategory,
    selectedCategoryId,
    usageCounts = {},
    onAddSubcategory,
    onEditCategory,
    onDeleteCategory
}: CategoryTreeProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Build tree structure (memoized for performance)
    const treeData = useMemo(() => {
        const tree = buildCategoryTree(categories);

        // Update expansion state in tree nodes
        const updateExpansion = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
            return nodes.map(node => ({
                ...node,
                isExpanded: expandedCategories.has(node.id),
                isInUse: (usageCounts[node.id] || 0) > 0,
                usageCount: usageCounts[node.id] || 0,
                children: updateExpansion(node.children)
            }));
        };

        return updateExpansion(tree);
    }, [categories, expandedCategories, usageCounts]);

    const handleToggleExpand = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    if (categories.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <p>No categories yet.</p>
                <p className="text-sm mt-1">Create your first category to get started.</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {treeData.map(node => (
                <TreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={onSelectCategory}
                    onToggleExpand={handleToggleExpand}
                    usageCount={usageCounts[node.id]}
                    onAddSubcategory={onAddSubcategory}
                    onEditCategory={onEditCategory}
                    onDeleteCategory={onDeleteCategory}
                />
            ))}
        </div>
    );
}
