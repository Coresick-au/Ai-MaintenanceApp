import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';

export const PartCatalogTable = ({ onAddPart, onEditPart }) => {
    const [parts, setParts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'ascending' });
    const [loading, setLoading] = useState(true);

    // Real-time listener for parts catalog
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'part_catalog'),
            (snapshot) => {
                const partsList = snapshot.docs.map(doc => doc.data());
                setParts(partsList);
                setLoading(false);
            },
            (error) => {
                console.error('[PartCatalog] Error fetching parts:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Calculate actual margin for each part
    const partsWithMargins = useMemo(() => {
        return parts.map(part => {
            const actualMargin = part.listPrice > 0
                ? ((part.listPrice - part.costPrice) / part.listPrice) * 100
                : 0;

            return {
                ...part,
                actualMarginPercent: actualMargin
            };
        });
    }, [parts]);

    // Filter and sort
    const filteredAndSortedParts = useMemo(() => {
        let filtered = partsWithMargins.filter(part =>
            part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            part.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [partsWithMargins, searchTerm, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <Icons.ChevronsUpDown size={14} className="text-slate-500" />;
        return sortConfig.direction === 'ascending'
            ? <Icons.ChevronUp size={14} className="text-cyan-400" />
            : <Icons.ChevronDown size={14} className="text-cyan-400" />;
    };

    const formatCurrency = (cents) => {
        return `$${(cents / 100).toFixed(2)}`;
    };

    const getMarginColor = (actual, target) => {
        if (actual >= target) return 'text-emerald-400';
        if (actual >= target * 0.9) return 'text-amber-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading catalog...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by SKU or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div className="text-sm text-slate-400">
                        {filteredAndSortedParts.length} part{filteredAndSortedParts.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <button
                    onClick={onAddPart}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Icons.Plus size={18} />
                    Add Part
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-slate-800/60 rounded-xl border border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('sku')}>
                                <div className="flex items-center gap-2">
                                    SKU {getSortIcon('sku')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-2">
                                    Name {getSortIcon('name')}
                                </div>
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('category')}>
                                <div className="flex items-center gap-2">
                                    Category {getSortIcon('category')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('costPrice')}>
                                <div className="flex items-center justify-end gap-2">
                                    Cost {getSortIcon('costPrice')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('listPrice')}>
                                <div className="flex items-center justify-end gap-2">
                                    List {getSortIcon('listPrice')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleSort('actualMarginPercent')}>
                                <div className="flex items-center justify-end gap-2">
                                    Margin {getSortIcon('actualMarginPercent')}
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center">Data Status</th>
                            <th className="px-4 py-3 text-center">Type</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredAndSortedParts.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                                    {searchTerm ? 'No parts match your search' : 'No parts in catalog. Add your first part to get started.'}
                                </td>
                            </tr>
                        ) : (
                            filteredAndSortedParts.map(part => (
                                <tr
                                    key={part.id}
                                    className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                                    onClick={() => onEditPart(part)}
                                >
                                    <td className="px-4 py-3 font-mono text-xs text-cyan-400">{part.sku}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {part.isSerialized && (
                                                <Icons.Barcode size={16} className="text-purple-400" title="Serialized Part" />
                                            )}
                                            <span className="text-white font-medium">{part.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">{part.category}</td>
                                    <td className="px-4 py-3 text-right text-slate-300">
                                        {part.costPrice === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(part.costPrice)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-medium">
                                        {part.listPrice === 0 ? <span className="text-amber-500/50">--</span> : formatCurrency(part.listPrice)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {part.listPrice > 0 ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <span className={`font-bold ${getMarginColor(part.actualMarginPercent, part.targetMarginPercent)}`}>
                                                    {part.actualMarginPercent.toFixed(1)}%
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    (Target: {part.targetMarginPercent}%)
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600 text-xs">--</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(part.costPrice === 0 || part.listPrice === 0) && (
                                            <div className="flex items-center justify-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20" title="Missing pricing data">
                                                <Icons.AlertTriangle size={12} />
                                                Missing Price
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${part.isSerialized
                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                            : 'bg-slate-700 text-slate-300'
                                            }`}>
                                            {part.isSerialized ? 'Serialized' : 'Consumable'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditPart(part);
                                            }}
                                            className="p-1.5 rounded hover:bg-slate-600 text-blue-400 transition-colors"
                                            title="Edit Part"
                                        >
                                            <Icons.Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
