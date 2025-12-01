import React, { useState, useMemo } from 'react';
import { Modal, Icons, formatDate } from './UIComponents';

export const AppHistoryModal = ({ isOpen, onClose, sites, asset }) => {


  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

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

  if (!isOpen) return null;

  return (
    <Modal title={asset ? `History: ${asset.name}` : "Complete App History"} onClose={onClose} maxWidth="max-w-6xl">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700">
          {/* Search */}
          <div className="flex-1 min-w-[250px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="site">🏢 Sites</option>
            <option value="service">🔧 Service</option>
            <option value="roller">⚙️ Rollers</option>
            <option value="spec">📋 Specs</option>
            <option value="report">📄 Reports</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-700 transition-colors flex items-center gap-2"
            title={sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          >
            {sortOrder === 'desc' ? <Icons.SortDesc /> : <Icons.SortAsc />}
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Icons.Download />
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-center">
            <div className="text-lg font-bold text-white">{allHistory.length}</div>
            <div className="text-xs text-slate-400">Total Events</div>
          </div>
          <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-800 text-center">
            <div className="text-lg font-bold text-blue-400">{allHistory.filter(h => h.type === 'site').length}</div>
            <div className="text-xs text-blue-300">Sites</div>
          </div>
          <div className="bg-green-900/30 p-3 rounded-lg border border-green-800 text-center">
            <div className="text-lg font-bold text-green-400">{allHistory.filter(h => h.type === 'service').length}</div>
            <div className="text-xs text-green-300">Service</div>
          </div>
          <div className="bg-orange-900/30 p-3 rounded-lg border border-orange-800 text-center">
            <div className="text-lg font-bold text-orange-400">{allHistory.filter(h => h.type === 'roller').length}</div>
            <div className="text-xs text-orange-300">Rollers</div>
          </div>
          <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-800 text-center">
            <div className="text-lg font-bold text-purple-400">{allHistory.filter(h => h.type === 'spec').length}</div>
            <div className="text-xs text-purple-300">Specs</div>
          </div>
          <div className="bg-cyan-900/30 p-3 rounded-lg border border-cyan-800 text-center">
            <div className="text-lg font-bold text-cyan-400">{allHistory.filter(h => h.type === 'report').length}</div>
            <div className="text-xs text-cyan-300">Reports</div>
          </div>
        </div>

        {/* History List */}
        <div className="bg-slate-900/50 rounded-lg border border-slate-700 max-h-[500px] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📜</div>
              <p>No history entries found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Type Badge */}
                    <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold border ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)} {entry.type.toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold text-slate-200">{entry.action}</div>
                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(entry.timestamp, true)}
                        </div>
                      </div>

                      <div className="text-sm text-slate-400 mb-1">
                        <span className="font-medium text-blue-400">{entry.siteName}</span>
                        {entry.assetName && (
                          <>
                            {' → '}
                            <span className="font-medium text-slate-300">{entry.assetName}</span>
                            {entry.assetCode && (
                              <span className="text-slate-500 ml-1">({entry.assetCode})</span>
                            )}
                          </>
                        )}
                      </div>

                      {entry.details && (
                        <div className="text-sm text-slate-500 line-clamp-2">
                          {entry.details}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                          👤 {entry.author}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-xs text-slate-500 text-center">
          Showing {filteredHistory.length} of {allHistory.length} events
        </div>
      </div>
    </Modal>
  );
};
