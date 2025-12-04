// ==========================================
// HELPER: DATE FORMATTER
// ==========================================
export const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let result = `${day}-${month}-${year}`;

    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        result += ` ${hours}:${minutes}`;
    }

    return result;
};

/**
 * @summary Calculates the overall health status of a site based on its assets' maintenance schedule.
 * FIXED: Now correctly checks serviceData and rollerData instead of non-existent 'assets'
 * 
 * @description Calculates the health status of a site based on its assets' maintenance status.
 * Combines serviceData and rollerData arrays and evaluates asset health based on remaining days
 * and operational status.
 * @param {Object} siteData - Site data object containing service and roller assets
 * @param {Array} siteData.serviceData - Array of service assets
 * @param {Array} siteData.rollerData - Array of roller assets
 * @returns {string} Health status: 'Overdue', 'Warning', or 'Good'
 * @example
 * // Example usage
 * const siteHealth = calculateSiteHealth({
 *   serviceData: [{ id: 1, remaining: -5, opStatus: 'Down' }],
 *   rollerData: [{ id: 2, remaining: 15, opStatus: 'Warning' }]
 * });
 * console.log(siteHealth); // Outputs: 'Overdue'
 */
export const calculateSiteHealth = (siteData) => {
  if (!siteData) return 'Good';

  // Combine the two data sources present in your SiteContext
  const allAssets = [
      ...(siteData.serviceData || []), 
      ...(siteData.rollerData || [])
  ];

  // Map statuses from the assets directly (assuming assets have a 'status' or you calculate it from 'opStatus')
  // Note: Your App.jsx suggests assets have 'opStatus' (Warning/Down) or 'remaining' (for overdue)
  
  // Logic based on your App.jsx rendering logic:
  const hasOverdue = allAssets.some(a => a.remaining < 0 || a.opStatus === 'Down');
  const hasWarning = allAssets.some(a => (a.remaining >= 0 && a.remaining < 30) || a.opStatus === 'Warning');

  if (hasOverdue) return 'Overdue';
  if (hasWarning) return 'Warning';

  return 'Good';
};
