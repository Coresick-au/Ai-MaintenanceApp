/**
 * Calculates percentage breakdown of site health status for circular visualization
 * 
 * @description Computes the percentage distribution of assets across health categories
 * (critical, warning, healthy) for use in circular progress indicators. Ignores inactive
 * assets and handles edge cases gracefully.
 * @param {Object} siteData - Site data object containing service and roller assets
 * @param {Array} siteData.serviceData - Array of service assets
 * @param {Array} siteData.rollerData - Array of roller assets
 * @returns {Object} Object containing percentages and total count
 * @returns {number} returns.critical - Percentage of critical assets (0-100)
 * @returns {number} returns.warning - Percentage of warning assets (0-100)
 * @returns {number} returns.healthy - Percentage of healthy assets (0-100)
 * @returns {number} returns.total - Total number of active assets
 * @example
 * // Example usage
 * const percentages = getSiteHealthPercentages({
 *   serviceData: [{ id: 1, remaining: -5, active: true }],
 *   rollerData: [{ id: 2, remaining: 15, active: true }]
 * });
 * console.log(percentages); // { critical: 50, warning: 50, healthy: 0, total: 2 }
 */
export const getSiteHealthPercentages = (siteData) => {
  if (!siteData) {
    return { critical: 0, warning: 0, healthy: 100, total: 0 };
  }

  // Combine the two data sources and filter for active assets only
  const allAssets = [
    ...(siteData.serviceData || []).filter(a => a.active !== false),
    ...(siteData.rollerData || []).filter(a => a.active !== false)
  ];

  const total = allAssets.length;
  
  if (total === 0) {
    return { critical: 0, warning: 0, healthy: 100, total: 0 };
  }

  // Count assets in each category
  const critical = allAssets.filter(a => a.remaining < 0 || a.opStatus === 'Down').length;
  const warning = allAssets.filter(a => (a.remaining >= 0 && a.remaining < 30) || a.opStatus === 'Warning').length;
  const healthy = total - critical - warning;

  // Calculate percentages
  return {
    critical: Math.round((critical / total) * 100),
    warning: Math.round((warning / total) * 100),
    healthy: Math.round((healthy / total) * 100),
    total
  };
};

/**
 * Gets the dominant health status for styling purposes
 * 
 * @description Determines the primary health status based on percentage distribution.
 * Critical takes priority, then warning, then healthy.
 * @param {Object} percentages - Result from getSiteHealthPercentages
 * @returns {string} Dominant status: 'critical', 'warning', or 'healthy'
 * @example
 * // Example usage
 * const percentages = getSiteHealthPercentages(siteData);
 * const dominant = getDominantHealthStatus(percentages);
 * console.log(dominant); // 'critical'
 */
export const getDominantHealthStatus = (percentages) => {
  if (percentages.critical > 0) return 'critical';
  if (percentages.warning > 0) return 'warning';
  return 'healthy';
};
