/**
 * Calculates the overall health status of a site based on all its assets
 * 
 * @description Evaluates the health status of a site by combining service and roller assets.
 * Returns 'critical' if any asset is overdue or down, 'warning' if any asset is due soon,
 * and 'healthy' if all assets are in good condition. Inactive assets are ignored.
 * @param {Object} siteData - Site data object containing service and roller assets
 * @param {Array} siteData.serviceData - Array of service assets
 * @param {Array} siteData.rollerData - Array of roller assets
 * @returns {string} Overall health status: 'critical', 'warning', or 'healthy'
 * @example
 * // Example usage
 * const siteHealth = getOverallSiteHealth({
 *   serviceData: [{ id: 1, remaining: -5, active: true }],
 *   rollerData: [{ id: 2, remaining: 15, active: true }]
 * });
 * console.log(siteHealth); // Outputs: 'critical'
 */
export const getOverallSiteHealth = (siteData) => {
  if (!siteData) return 'healthy';

  // Combine the two data sources and filter for active assets only
  const allAssets = [
    ...(siteData.serviceData || []).filter(a => a.active !== false),
    ...(siteData.rollerData || []).filter(a => a.active !== false)
  ];

  // Check for critical issues first (highest priority)
  const hasCritical = allAssets.some(a => 
    a.remaining < 0 || a.opStatus === 'Down'
  );

  if (hasCritical) return 'critical';

  // Check for warning issues (medium priority)
  const hasWarning = allAssets.some(a => 
    (a.remaining >= 0 && a.remaining < 30) || a.opStatus === 'Warning'
  );

  if (hasWarning) return 'warning';

  // If no issues, site is healthy
  return 'healthy';
};

/**
 * Gets the color and styling for a site health status
 * 
 * @description Returns the appropriate Tailwind CSS classes and colors for displaying
 * the site health status as a visual indicator (circle, badge, etc.).
 * @param {string} status - Health status from getOverallSiteHealth
 * @returns {Object} Object containing color classes and status text
 * @example
 * // Example usage
 * const { circleClass, textClass, bgColor, borderColor } = getSiteHealthStyling('critical');
 * // Returns: { circleClass: 'bg-red-500', textClass: 'text-red-400', bgColor: 'bg-red-900/40', borderColor: 'border-red-900/60' }
 */
export const getSiteHealthStyling = (status) => {
  const styles = {
    critical: {
      circleClass: 'bg-red-500',
      textClass: 'text-red-400',
      bgColor: 'bg-red-900/40',
      borderColor: 'border-red-900/60',
      statusText: 'Critical'
    },
    warning: {
      circleClass: 'bg-amber-500',
      textClass: 'text-amber-400',
      bgColor: 'bg-amber-900/40',
      borderColor: 'border-amber-900/60',
      statusText: 'Warning'
    },
    healthy: {
      circleClass: 'bg-green-500',
      textClass: 'text-green-400',
      bgColor: 'bg-green-900/40',
      borderColor: 'border-green-900/60',
      statusText: 'Healthy'
    }
  };

  return styles[status] || styles.healthy;
};
