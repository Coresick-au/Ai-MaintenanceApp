import React, { createContext, useState, useMemo } from 'react';
import { useSiteContext } from '../hooks/useSiteContext';
import { sortSitesByRisk, filterMaintenanceData, sortMaintenanceData, calculateMaintenanceStats } from '../utils/filterUtils';

const FilterContext = createContext();

export { FilterContext };
export const FilterProvider = ({ children }) => {
    const { sites, currentServiceData, currentRollerData } = useSiteContext();

    const [activeTab, setActiveTab] = useState('service');
    const [siteSearchQuery, setSiteSearchQuery] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isRollerOnlyMode, setIsRollerOnlyMode] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [selectedRowIds, setSelectedRowIds] = useState(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const [siteSortOption, setSiteSortOption] = useState('risk');

    // --- DERIVED STATE ---
    const filteredSites = useMemo(() => {
        let result = sites.filter(site => {
            const matchesSearch = (site.name || '').toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                (site.customer || '').toLowerCase().includes(siteSearchQuery.toLowerCase()) ||
                (site.location || '').toLowerCase().includes(siteSearchQuery.toLowerCase());
            return showArchived ? matchesSearch : (matchesSearch && site.active !== false);
        });

        if (siteSortOption === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (siteSortOption === 'customer') {
            result.sort((a, b) => (a.customer || '').localeCompare(b.customer || ''));
        } else if (siteSortOption === 'type') {
            result.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
        } else {
            result = sortSitesByRisk(result);
        }
        return result;
    }, [sites, siteSearchQuery, siteSortOption, showArchived]);

    const currentTableData = activeTab === 'service' ? currentServiceData : currentRollerData;

    const filteredData = useMemo(() => {
        let data = filterMaintenanceData(currentTableData, searchTerm, filterStatus, showArchived);
        return sortMaintenanceData(data, sortConfig);
    }, [currentTableData, searchTerm, filterStatus, sortConfig, showArchived]);

    const stats = useMemo(() => {
        return calculateMaintenanceStats(currentTableData);
    }, [currentTableData]);

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const toggleRow = (id) => {
        const newSelection = new Set(selectedRowIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedRowIds(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedRowIds.size === filteredData.length) {
            setSelectedRowIds(new Set());
        } else {
            setSelectedRowIds(new Set(filteredData.map(item => item.id)));
        }
    };

    // --- REPORT SELECTION STATE ---
    const [selectedReportIds, setSelectedReportIds] = useState(new Set());

    const toggleReportSelection = (id) => {
        const newSelection = new Set(selectedReportIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedReportIds(newSelection);
    };

    const clearReportSelections = () => setSelectedReportIds(new Set());

    return (
        <FilterContext.Provider value={{
            activeTab, setActiveTab,
            siteSearchQuery, setSiteSearchQuery,
            searchTerm, setSearchTerm,
            filterStatus, setFilterStatus,
            isRollerOnlyMode, setIsRollerOnlyMode,
            sortConfig, setSortConfig,
            selectedRowIds, setSelectedRowIds,
            showArchived, setShowArchived,
            siteSortOption, setSiteSortOption,
            filteredSites,
            currentTableData,
            filteredData,
            stats,
            handleSort,
            toggleRow,
            toggleSelectAll,
            selectedReportIds, setSelectedReportIds,
            toggleReportSelection, clearReportSelections
        }}>
            {children}
        </FilterContext.Provider>
    );
};
