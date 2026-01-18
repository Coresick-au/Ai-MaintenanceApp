import React, { useState, useEffect, useContext } from 'react';
import { Icons } from '../../constants/icons';
import { SitePartModal } from './SitePartModal';
import { getSiteParts, deleteSitePart } from '../../services/sitePartService';
import { useGlobalData } from '../../context/GlobalDataContext';
import { exportToCSV } from '../../utils/csvExportImport';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SitePartReportPDF } from './SitePartReportPDF';

export function SitePartManager() {
    const { getAllMaintenanceAppSites } = useGlobalData();
    const sites = getAllMaintenanceAppSites();
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [selectedSiteFilter, setSelectedSiteFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'siteName', direction: 'ascending' });

    useEffect(() => {
        loadParts();
    }, []);

    const loadParts = async () => {
        setLoading(true);
        try {
            const data = await getSiteParts();
            setParts(data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to load site parts');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this site part?')) return;
        try {
            await deleteSitePart(id);
            setParts(parts.filter(p => p.id !== id));
        } catch (err) {
            setError('Failed to delete part');
        }
    };

    const handleEdit = (part) => {
        setEditingPart(part);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingPart(null);
        setIsModalOpen(true);
    };

    const filteredParts = parts.filter(part => {
        const matchesSite = selectedSiteFilter ? part.siteId === selectedSiteFilter : true;
        const matchesSearch = searchQuery
            ? part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (part.description || '').toLowerCase().includes(searchQuery.toLowerCase())
            : true;
        return matchesSite && matchesSearch;
        return matchesSite && matchesSearch;
    });

    // Sort the filtered results
    const sortedParts = [...filteredParts].sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';

        // Case insensitive sorting for strings
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <Icons.ChevronsUpDown size={14} className="text-slate-500 ml-1" />;
        return sortConfig.direction === 'ascending'
            ? <Icons.ChevronUp size={14} className="text-cyan-400 ml-1" />
            : <Icons.ChevronDown size={14} className="text-cyan-400 ml-1" />;
    };

    const handleExport = () => {
        if (sortedParts.length === 0) {
            alert('No parts to export');
            return;
        }

        const data = sortedParts.map(part => ({
            'Site Name': part.siteName || 'Unknown',
            'Part Number': part.partNumber,
            'Description': part.description || '',
            'Link Type': part.internalPartType === 'none' ? 'Manual' : part.internalPartType,
            'Internal Part ID': part.internalPartId || '',
            'Asset Count': part.linkedAssetIds?.length || 0,
            'Created At': part.createdAt ? new Date(part.createdAt).toLocaleDateString() : ''
        }));

        const timestamp = new Date().toISOString().split('T')[0];
        exportToCSV(data, `Site_Parts_Export_${timestamp}.csv`);
    };

    const handlePrintPDF = async () => {
        if (sortedParts.length === 0) {
            alert('No parts to print');
            return;
        }

        try {
            setLoading(true); // Show visual feedback

            // 1. Gather all assets from all sites to create a lookup map
            // We need this because parts only store asset IDs, not names/codes
            const allSites = getAllMaintenanceAppSites(); // From Global Context
            const assetMap = {};

            allSites.forEach(site => {
                // Map Service Assets
                if (site.serviceData) {
                    site.serviceData.forEach(asset => {
                        assetMap[asset.id] = { name: asset.name, code: asset.code };
                    });
                }
                // Map Roller Assets
                if (site.rollerData) {
                    site.rollerData.forEach(asset => {
                        assetMap[asset.id] = { name: asset.name, code: asset.code };
                    });
                }
            });

            // 2. Generate PDF
            const blob = await pdf(
                <SitePartReportPDF
                    parts={sortedParts}
                    assetMap={assetMap}
                />
            ).toBlob();

            // 3. Save File
            const timestamp = new Date().toISOString().split('T')[0];
            saveAs(blob, `Site_Parts_Report_${timestamp}.pdf`);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Icons.Tag size={24} />
                            Site Specific Parts
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Manage customer specific part numbers and link them to internal inventory
                        </p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                        <Icons.Plus size={20} />
                        Add Site Part
                    </button>
                    <button
                        onClick={handlePrintPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                        <Icons.Printer size={20} />
                        Print PDF
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                    >
                        <Icons.Download size={20} />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-4">
                    <div className="flex-1 max-w-xs">
                        <select
                            value={selectedSiteFilter}
                            onChange={e => setSelectedSiteFilter(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-lg p-2 text-white"
                        >
                            <option value="">All Sites</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 max-w-sm relative">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search part numbers..."
                            className="w-full bg-slate-700 border-slate-600 rounded-lg py-2 pl-10 pr-4 text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto h-full">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0">
                            <tr>
                                <th
                                    className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('siteName')}
                                >
                                    <div className="flex items-center">
                                        Site {getSortIcon('siteName')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => handleSort('partNumber')}
                                >
                                    <div className="flex items-center">
                                        Part Number {getSortIcon('partNumber')}
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-medium text-slate-400">Description</th>
                                <th className="px-6 py-3 font-medium text-slate-400">Internal Link</th>
                                <th className="px-6 py-3 font-medium text-slate-400 text-center">Linked Assets</th>
                                <th className="px-6 py-3 font-medium text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                        <Icons.Loader size={32} className="animate-spin mx-auto mb-2" />
                                        Loading parts...
                                    </td>
                                </tr>
                            ) : sortedParts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                        No site parts found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                sortedParts.map(part => (
                                    <tr key={part.id} className="hover:bg-slate-700/50">
                                        <td className="px-6 py-3 text-slate-300">{part.siteName}</td>
                                        <td className="px-6 py-3 font-mono text-cyan-400 font-medium">
                                            {part.partNumber}
                                        </td>
                                        <td className="px-6 py-3 text-slate-300 max-w-xs truncate" title={part.description}>
                                            {part.description || '-'}
                                        </td>
                                        <td className="px-6 py-3 text-slate-300">
                                            {part.internalPartId ? (
                                                <span className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                                                    <Icons.Link size={12} />
                                                    Linked ({part.internalPartType})
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-xs">Manual</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {part.linkedAssetIds?.length > 0 ? (
                                                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
                                                    {part.linkedAssetIds.length}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(part)}
                                                    className="p-1.5 hover:bg-slate-600 rounded text-cyan-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Icons.Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(part.id)}
                                                    className="p-1.5 hover:bg-slate-600 rounded text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Icons.Trash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <SitePartModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingPart={editingPart}
                onSuccess={loadParts}
            />
        </div>
    );
}
