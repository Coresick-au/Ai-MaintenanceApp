import { Timestamp } from 'firebase/firestore';

/**
 * Core Category interface representing a category in the system.
 * Supports hierarchical organization using Adjacency List (parentId) + Materialized Path (path).
 */
export interface Category {
    /** Firestore document ID */
    id: string;

    /** Category name (e.g., "Systems & Assemblies", "Load cell") */
    name: string;

    /** Parent category ID - null for root categories, ID string for subcategories */
    parentId: string | null;

    /** Materialized path array for efficient hierarchy queries (e.g., ["root-id", "parent-id", "this-id"]) */
    path: string[];

    /** Timestamp when category was created */
    createdAt: Timestamp;

    /** Timestamp when category was last updated */
    updatedAt: Timestamp;
}

/**
 * Category Data Transfer Object for Firestore operations.
 * Excludes the 'id' field as Firestore documents store IDs separately.
 */
export interface CategoryDTO {
    name: string;
    parentId: string | null;
    path: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Category Tree Node for UI representation.
 * Extends Category with children array for rendering tree structures.
 */
export interface CategoryTreeNode extends Category {
    /** Child categories for rendering tree view */
    children: CategoryTreeNode[];

    /** UI state: whether this node is expanded in the tree view */
    isExpanded?: boolean;

    /** UI state: whether this category is currently in use by inventory items */
    isInUse?: boolean;

    /** UI state: count of inventory items using this category */
    usageCount?: number;
}

/**
 * Partial Category for creating new categories (omitting auto-generated fields).
 */
export type CategoryCreate = Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'path'> & {
    name: string;
    parentId: string | null;
};

/**
 * Partial Category for updating existing categories.
 */
export type CategoryUpdate = Partial<Pick<Category, 'name' | 'parentId'>>;

/**
 * Category with subcategory selection for forms.
 * Supports both single-select (subcategoryId) and multi-select (subcategoryIds) modes.
 */
export interface CategorySelection {
    categoryId: string | null;
    subcategoryId?: string | null; // Single-select mode
    subcategoryIds?: string[]; // Multi-select mode
}

/**
 * Category usage check result.
 */
export interface CategoryUsage {
    inUse: boolean;
    count: number;
    collections?: string[]; // Which collections reference this category (e.g., ['parts', 'products'])
}
