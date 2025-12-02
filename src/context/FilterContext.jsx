import React, { createContext, useState, useMemo, useContext } from 'react';
import { useSiteContext } from './SiteContext';

const FilterContext = createContext();

export const useFilterContext = () => useContext(FilterContext);

export const FilterProvider = ({ children }) => {
    const { sites, selectedSite, currentServiceData, currentRollerData } = useSiteContext();

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
            result.sort((a, b) => {
                const countCritical = (site) => {
                    const service = (site.serviceData || []).filter(a => a.active !== false);
                    const roller = (site.rollerData || []).filter(a => a.active !== false);
                    return [...service, ...roller].filter(i => i.remaining < 0).length;
                };
                return countCritical(b) - countCritical(a);
            });
        }
        return result;
    }, [sites, siteSearchQuery, siteSortOption, showArchived]);

    const currentTableData = activeTab === 'service' ? currentServiceData : currentRollerData;

    const filteredData = useMemo(() => {
        if (!currentTableData) return [];
        let data = currentTableData.filter(item => showArchived ? true : item.active !== false);

        data = data.filter(item =>
            (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.weigher || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filterStatus === 'overdue') data = data.filter(d => d.remaining < 0);
        else if (filterStatus === 'dueSoon') data = data.filter(d => d.remaining >= 0 && d.remaining < 30);
        else if (filterStatus === 'healthy') data = data.filter(d => d.remaining >= 30);

        if (sortConfig.key) {
            data.sort((a, b) => {
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
        }
        return data;
    }, [currentTableData, searchTerm, filterStatus, sortConfig, showArchived]);

    const stats = useMemo(() => {
        if (!currentTableData) return { overdue: 0, dueSoon: 0, total: 0 };
        const activeData = currentTableData.filter(d => d.active !== false);

        const total = activeData.length;
        const overdue = activeData.filter(d => d.remaining < 0).length;
        const dueSoon = activeData.filter(d => d.remaining >= 0 && d.remaining < 30).length;
        const healthy = activeData.filter(d => d.remaining >= 30).length;
        return { total, overdue, dueSoon, healthy };
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
