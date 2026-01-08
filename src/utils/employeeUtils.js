// Employee utility functions for compliance tracking

/**
 * Calculate expiry status based on days remaining
 * @param {string} expiryDate - ISO date string or 'N/A' for no expiry
 * @returns {'valid'|'warning'|'expired'} Status indicator
 */
export const getExpiryStatus = (expiryDate) => {
    if (!expiryDate || expiryDate === 'N/A') return 'valid';

    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

    if (days < 0) return 'expired';
    if (days < 60) return 'warning';
    return 'valid';
};

/**
 * Get days until expiry
 * @param {string} expiryDate - ISO date string or 'N/A' for no expiry
 * @returns {number} Days remaining (negative if expired, Infinity if no expiry)
 */
export const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate || expiryDate === 'N/A') return Infinity;
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
};

/**
 * Get overall compliance status for an employee
 * @param {Object} employee - Employee object with certifications
 * @returns {'compliant'|'warning'|'non-compliant'} Overall status
 */
export const getEmployeeComplianceStatus = (employee) => {
    if (!employee.certifications || employee.certifications.length === 0) {
        return 'non-compliant';
    }

    const statuses = employee.certifications.map(cert => getExpiryStatus(cert.expiry));

    if (statuses.includes('expired')) return 'non-compliant';
    if (statuses.includes('warning')) return 'warning';
    return 'compliant';
};

/**
 * Filter employees by compliance status
 * @param {Array} employees - Array of employee objects
 * @param {'compliant'|'warning'|'non-compliant'} status - Status to filter by
 * @returns {Array} Filtered employees
 */
export const filterEmployeesByStatus = (employees, status) => {
    return employees.filter(emp => getEmployeeComplianceStatus(emp) === status);
};

/**
 * Sort employees by next expiring certification
 * @param {Array} employees - Array of employee objects
 * @returns {Array} Sorted employees (soonest expiry first)
 */
export const sortEmployeesByExpiry = (employees) => {
    return [...employees].sort((a, b) => {
        const aNextExpiry = Math.min(...(a.certifications || []).map(c => getDaysUntilExpiry(c.expiry)));
        const bNextExpiry = Math.min(...(b.certifications || []).map(c => getDaysUntilExpiry(c.expiry)));
        return aNextExpiry - bNextExpiry;
    });
};

/**
 * Get status color classes for Tailwind
 * @param {'valid'|'warning'|'expired'} status - Status indicator
 * @returns {string} Tailwind class string
 */
export const getStatusColorClasses = (status) => {
    if (status === 'expired') return 'text-red-400 bg-red-900/20 border-red-900';
    if (status === 'warning') return 'text-yellow-400 bg-yellow-900/20 border-yellow-900';
    return 'text-green-400 bg-green-900/20 border-green-900';
};

/**
 * Get compliance summary for all employees
 * @param {Array} employees - Array of employee objects
 * @returns {Object} Summary statistics
 */
export const getComplianceSummary = (employees) => {
    const total = employees.filter(e => e.active !== false).length;
    const compliant = filterEmployeesByStatus(employees, 'compliant').length;
    const warning = filterEmployeesByStatus(employees, 'warning').length;
    const nonCompliant = filterEmployeesByStatus(employees, 'non-compliant').length;

    return { total, compliant, warning, nonCompliant };
};
