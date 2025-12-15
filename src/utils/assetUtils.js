/**
 * Asset Counting Utilities
 * 
 * Utilities for counting unique assets across service and roller schedules.
 * Assets are linked by their 'weigher' field - each physical asset has both
 * a service schedule (3-month) and a roller schedule (12-month).
 */

/**
 * Get unique assets based on weigher field
 * @param {Array} serviceData - Array of service schedule assets
 * @param {Array} rollerData - Array of roller schedule assets
 * @returns {Array} Array of unique assets (one per weigher)
 */
export const getUniqueAssets = (serviceData, rollerData) => {
    const allAssets = [...(serviceData || []), ...(rollerData || [])];
    const uniqueWeighers = new Set();

    return allAssets.filter(asset => {
        // Filter out archived assets
        if (asset.active === false) return false;

        // Include assets without weigher field (legacy data)
        if (!asset.weigher) return true;

        // Filter duplicates by weigher
        if (uniqueWeighers.has(asset.weigher)) return false;

        uniqueWeighers.add(asset.weigher);
        return true;
    });
};

/**
 * Count unique assets
 * @param {Array} serviceData - Array of service schedule assets
 * @param {Array} rollerData - Array of roller schedule assets
 * @returns {number} Count of unique assets
 */
export const countUniqueAssets = (serviceData, rollerData) => {
    return getUniqueAssets(serviceData, rollerData).length;
};

/**
 * Get asset health metrics considering both service and roller schedules
 * @param {Array} serviceData - Array of service schedule assets
 * @param {Array} rollerData - Array of roller schedule assets
 * @returns {Object} Health metrics { critical, dueSoon, healthy, total }
 */
export const getAssetHealthMetrics = (serviceData, rollerData) => {
    const allAssets = [...(serviceData || []), ...(rollerData || [])]
        .filter(asset => asset.active !== false);

    const critical = allAssets.filter(a => a.remaining < 0).length;
    const dueSoon = allAssets.filter(a => a.remaining >= 0 && a.remaining < 30).length;
    const healthy = allAssets.filter(a => a.remaining >= 30).length;
    const total = allAssets.length;

    return {
        critical,
        dueSoon,
        healthy,
        total,
        criticalPct: total > 0 ? (critical / total) * 100 : 0,
        dueSoonPct: total > 0 ? (dueSoon / total) * 100 : 0,
        healthyPct: total > 0 ? (healthy / total) * 100 : 0
    };
};
