/**
 * Induction Category Definitions
 * 
 * Defines the available induction/certification categories with their
 * visual styling and metadata.
 */

export const INDUCTION_CATEGORIES = {
    site: {
        label: 'Site Induction',
        icon: '🏗️',
        color: 'cyan',
        description: 'Site-specific access and safety induction'
    },
    driving: {
        label: 'Driving License',
        icon: '🚗',
        color: 'blue',
        description: 'Vehicle operation license'
    },
    medical: {
        label: 'Medical Certificate',
        icon: '⚕️',
        color: 'green',
        description: 'Health and medical clearance'
    },
    safety: {
        label: 'Safety Training',
        icon: '🦺',
        color: 'amber',
        description: 'General safety training'
    },
    equipment: {
        label: 'Equipment Certification',
        icon: '⚙️',
        color: 'purple',
        description: 'Specific machinery certification'
    },
    custom: {
        label: 'Custom',
        icon: '📋',
        color: 'slate',
        description: 'Custom site-specific requirement'
    }
};

/**
 * Get Tailwind CSS classes for a category color
 * @param {string} category - Category key (e.g., 'site', 'driving')
 * @returns {object} Object with bg, border, and text color classes
 */
export const getCategoryColors = (category) => {
    const colorMap = {
        cyan: {
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/30',
            text: 'text-cyan-400'
        },
        blue: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            text: 'text-blue-400'
        },
        green: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            text: 'text-emerald-400'
        },
        amber: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            text: 'text-amber-400'
        },
        purple: {
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/30',
            text: 'text-purple-400'
        },
        slate: {
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/30',
            text: 'text-slate-400'
        }
    };

    const categoryColor = INDUCTION_CATEGORIES[category]?.color || 'slate';
    return colorMap[categoryColor] || colorMap.slate;
};

/**
 * Get display label for an induction
 * @param {object} induction - Induction object
 * @returns {string} Display label
 */
export const getInductionLabel = (induction) => {
    if (induction.category === 'custom' && induction.customCategory) {
        return induction.customCategory;
    }
    return INDUCTION_CATEGORIES[induction.category]?.label || 'Unknown';
};

/**
 * Get icon for an induction category
 * @param {string} category - Category key
 * @returns {string} Emoji icon
 */
export const getCategoryIcon = (category) => {
    return INDUCTION_CATEGORIES[category]?.icon || '📋';
};
