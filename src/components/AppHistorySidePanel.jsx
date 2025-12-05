import React, { useState, useMemo } from 'react';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { useSiteContext } from '../hooks/useSiteContext';

export const AppHistorySidePanel = ({ isOpen, onClose, asset, searchQuery: initialSearchQuery }) => {
  const { sites, handleClearAllHistory } = useSiteContext();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [deleteStep, setDeleteStep] = useState(0);

  // Collect all history entries from all sites, assets, and specs
  const allHistory = useMemo(() => {
    const history = [];

    sites.forEach(site => {
      // Site notes as history
      (site.notes || []).forEach(note => {
        history.push({
          id: note.id,
          timestamp: note.timestamp,
          type: 'site',
          action: 'Site Note Added',
          siteName: site.name,
          siteId: site.id,
          details: note.content,
          author: note.author,
        });
      });

      // Service asset history
      (site.serviceData || []).forEach(asset => {
        (asset.history || []).forEach(h => {
          history.push({
            id: `${asset.id}-${h.date}`,
            timestamp: h.date,
            type: 'service',
            action: h.action,
            siteName: site.name,
            siteId: site.id,
            assetName: asset.name,
            assetCode: asset.code,
            assetId: asset.id,
            details: `${asset.name} (${asset.code})`,
            author: h.user,
          });
        });

        // Report history
        (asset.reports || []).forEach(report => {
          history.push({
            id: report.id,
            timestamp: report.timestamp,
            type: 'report',
            action: 'Report Uploaded',
            siteName: site.name,
            siteId: site.id,
            assetName: asset.name,
            assetCode: asset.code,
            assetId: asset.id,
            details: `${report.fileName} - ${asset.name}`,
            author: 'User',
          });
        });
      });

      // Roller asset history
      (site.rollerData || []).forEach(asset => {
        (asset.history || []).forEach(h => {
          history.push({
            id: `${asset.id}-${h.date}`,
            timestamp: h.date,
            type: 'roller',
            action: h.action,
            siteName: site.name,
            siteId: site.id,
            assetName: asset.name,
            assetCode: asset.code,
            assetId: asset.id,
            details: `${asset.name} (${asset.code})`,
            author: h.user,
          });
        });

        // Report history
        (asset.reports || []).forEach(report => {
          history.push({
            id: report.id,
            timestamp: report.timestamp,
            type: 'report',
            action: 'Report Uploaded',
            siteName: site.name,
            siteId: site.id,
            assetName: asset.name,
            assetCode: asset.code,
            assetId: asset.id,
            details: `${report.fileName} - ${asset.name}`,
            author: 'User',
          });
        });
      });

      // Spec history
      (site.specData || []).forEach(spec => {
        (spec.history || []).forEach(h => {
          history.push({
            id: `${spec.id}-${h.date}`,
            timestamp: h.date,
            type: 'spec',
            action: h.action,
            siteName: site.name,
            siteId: site.id,
            details: `${spec.description || spec.weigher}`,
            author: h.user,
          });
        });

        // Spec notes
        (spec.notes || []).forEach(note => {
          history.push({
            id: note.id,
            timestamp: note.timestamp,
            type: 'spec',
            action: 'Spec Note Added',
            siteName: site.name,
            siteId: site.id,
            details: `${spec.description || spec.weigher}: ${note.content}`,
            author: note.author,
          });
        });
      });
    });

    return history;
  }, [sites]);

  // Filter and sort history
  const filteredHistory = useMemo(() => {
    let filtered = allHistory;

    // Filter by specific asset if provided
    if (asset) {
      filtered = filtered.filter(h => h.assetId === asset.id);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        (h.siteName || '').toLowerCase().includes(query) ||
        (h.assetName || '').toLowerCase().includes(query) ||
        (h.assetCode || '').toLowerCase().includes(query) ||
        (h.action || '').toLowerCase().includes(query) ||
        (h.details || '').toLowerCase().includes(query) ||
        (h.author || '').toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(h => h.type === filterType);
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [allHistory, searchQuery, filterType, sortOrder, asset]);

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Action', 'Site', 'Asset', 'Details', 'Author'];
    const rows = filteredHistory.map(h => [
      formatDate(h.timestamp, true),
      h.type,
      h.action,
      h.siteName,
      h.assetName || '-',
      h.details,
      h.author,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `app_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'site': return '🏢';
      case 'service': return '🔧';
      case 'roller': return '⚙️';
      case 'spec': return '📋';
      case 'report': return '📄';
      default: return '📝';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'site': return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case 'service': return 'bg-green-900/30 text-green-400 border-green-800';
      case 'roller': return 'bg-orange-900/30 text-orange-400 border-orange-800';
      case 'spec': return 'bg-purple-900/30 text-purple-400 border-purple-800';
      case 'report': return 'bg-cyan-900/30 text-cyan-400 border-cyan-800';
      default: return 'bg-slate-900/30 text-slate-400 border-slate-800';
    }
  };

  const handleDeleteClick = () => {
    if (deleteStep < 3) {
      setDeleteStep(deleteStep + 1);
    }
  };

  const handleConfirmDelete = () => {
    handleClearAllHistory();
    setDeleteStep(0);
  };

  const handleCancelDelete = () => {
    setDeleteStep(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[59]" 
        onClick={onClose}
      />
      {/* Side Panel */}
      <div className="fixed inset-y-0 right-0 w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-[60] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-slate-700">
        <h3 className="font-semibold text-lg text-slate-200">
          {asset ? `History: ${asset.name}` : "Complete App History"}
        </h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-100 hover:text-white">
          <Icons.X />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icons.Search />
              </span>
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter and Sort */}
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="site">🏢 Sites</option>
                <option value="service">🔧 Service</option>
                <option value="roller">⚙️ Rollers</option>
                <option value="spec">📋 Specs</option>
                <option value="report">📄 Reports</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-600 transition-colors flex items-center gap-1"
                title={sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              >
                {sortOrder === 'desc' ? <Icons.SortDesc /> : <Icons.SortAsc />}
              </button>
            </div>

            {/* Export and Delete */}
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Icons.Download />
                Export CSV
              </button>
              
              <button
                onClick={handleDeleteClick}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Icons.Trash />
                Delete
              </button>
            </div>
          </div>

          {/* Delete Confirmation */}
          {deleteStep > 0 && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 space-y-3">
              <div className="text-red-300 text-sm">
                {deleteStep === 1 && "⚠️ This will delete ALL history entries across ALL sites. Are you sure?"}
                {deleteStep === 2 && "⚠️⚠️ This action cannot be undone. All maintenance records, notes, and reports will be permanently deleted. Continue?"}
                {deleteStep === 3 && "🔴 ADMIN ONLY: This is the final warning. All app history will be permanently erased. Are you absolutely sure?"}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                {deleteStep === 3 && (
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete Everything
                  </button>
                )}
                {deleteStep < 3 && (
                  <button
                    onClick={handleDeleteClick}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Yes, Continue
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-700 p-2 rounded text-center">
              <div className="text-lg font-bold text-white">{allHistory.length}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
            <div className="bg-slate-700 p-2 rounded text-center">
              <div className="text-lg font-bold text-blue-400">{allHistory.filter(h => h.type === 'site').length}</div>
              <div className="text-xs text-blue-300">Sites</div>
            </div>
            <div className="bg-slate-700 p-2 rounded text-center">
              <div className="text-lg font-bold text-green-400">{allHistory.filter(h => h.type === 'service').length}</div>
              <div className="text-xs text-green-300">Service</div>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">📜</div>
                <p>No history entries found</p>
              </div>
            ) : (
              filteredHistory.slice(0, 50).map((entry) => (
                <div
                  key={entry.id}
                  className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {/* Type Badge */}
                    <div className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold border ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-200 text-sm mb-1">{entry.action}</div>
                      
                      <div className="text-xs text-slate-400 mb-1">
                        <span className="font-medium text-blue-400">{entry.siteName}</span>
                        {entry.assetName && (
                          <>
                            {' → '}
                            <span className="font-medium text-slate-300">{entry.assetName}</span>
                          </>
                        )}
                      </div>

                      {entry.details && (
                        <div className="text-xs text-slate-400 line-clamp-2 mb-1">
                          {entry.details}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          👤 {entry.author}
                        </span>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(entry.timestamp, true)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          {filteredHistory.length > 50 && (
            <div className="text-xs text-slate-400 text-center pt-2 border-t border-slate-600">
              Showing first 50 of {filteredHistory.length} events
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};
