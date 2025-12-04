// Filter and sorting utilities for maintenance data

export const countCriticalAssets = (site) => {
    const service = (site.serviceData || []).filter(a => a.active !== false);
    const roller = (site.rollerData || []).filter(a => a.active !== false);
    return [...service, ...roller].filter(i => i.remaining < 0).length;
};

export const sortSitesByRisk = (sites) => {
    return sites.sort((a, b) => countCriticalAssets(b) - countCriticalAssets(a));
};

export const filterMaintenanceData = (data, searchTerm, filterStatus, showArchived) => {
    if (!data) return [];
    
    let filteredData = data.filter(item => showArchived ? true : item.active !== false);

    filteredData = filteredData.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.weigher || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus === 'overdue') filteredData = filteredData.filter(d => d.remaining < 0);
    else if (filterStatus === 'dueSoon') filteredData = filteredData.filter(d => d.remaining >= 0 && d.remaining < 30);
    else if (filterStatus === 'healthy') filteredData = filteredData.filter(d => d.remaining >= 30);

    return filteredData;
};

export const sortMaintenanceData = (data, sortConfig) => {
    if (!sortConfig.key) return data;
    
    return data.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'dueDate') {
            aVal = new Date(a.dueDate).getTime();
            bVal = new Date(b.dueDate).getTime();
        }

        if (aVal < bVal) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });
};

export const calculateMaintenanceStats = (data) => {
    if (!data) return { overdue: 0, dueSoon: 0, total: 0, healthy: 0 };
    
    const activeData = data.filter(d => d.active !== false);
    const total = activeData.length;
    const overdue = activeData.filter(d => d.remaining < 0).length;
    const dueSoon = activeData.filter(d => d.remaining >= 0 && d.remaining < 30).length;
    const healthy = activeData.filter(d => d.remaining >= 30).length;
    
    return { total, overdue, dueSoon, healthy };
};
