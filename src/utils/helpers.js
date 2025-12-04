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
 * @param {object} siteData - The full site data object, including assets.
 * @returns {'Overdue' | 'Warning' | 'Good'} The overall health status.
 * @docs
 * The status is determined by the worst-case maintenance item found:
 * - Overdue: If any asset has an 'Overdue' status.
 * - Warning: If any asset has a 'Warning' (due soon) status and no 'Overdue' status is present.
 * - Good: If all assets are 'Good'.
 */
export const calculateSiteHealth = (siteData) => {
  const statuses = siteData.assets.flatMap(asset => asset.maintenanceSchedule.map(item => item.status));

  if (statuses.includes('Overdue')) return 'Overdue';
  if (statuses.includes('Warning')) return 'Warning';

  return 'Good';
};
