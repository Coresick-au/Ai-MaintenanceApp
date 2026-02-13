import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { UIContext } from '../context/UIContext';

// Column filter dropdown component
const ColumnFilter = ({ columnKey, uniqueValues, activeFilters, onFilterChange, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentFilters = activeFilters[columnKey];
  const hasActiveFilter = currentFilters && currentFilters.length < uniqueValues.length;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`ml-1 p-0.5 rounded transition-colors ${hasActiveFilter ? 'text-cyan-400' : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
        title="Filter column"
      >
        <Icons.Filter size={12} />
      </button>
      {isOpen && (
        <div className={`absolute top-full right-0 mt-1 z-50 rounded-lg shadow-xl border min-w-[180px] max-h-[300px] overflow-auto ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`sticky top-0 p-2 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}>
            <button
              onClick={() => onFilterChange(columnKey, uniqueValues)}
              className="text-[10px] text-cyan-400 hover:text-cyan-300"
            >
              Select All
            </button>
            <button
              onClick={() => onFilterChange(columnKey, [])}
              className="text-[10px] text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>
          {uniqueValues.map(val => {
            const isChecked = !currentFilters || currentFilters.includes(val);
            return (
              <label
                key={val}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const current = currentFilters || [...uniqueValues];
                    const updated = isChecked
                      ? current.filter(v => v !== val)
                      : [...current, val];
                    onFilterChange(columnKey, updated);
                  }}
                  className="w-3 h-3 rounded"
                />
                <span className="truncate">{val || '(empty)'}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const MasterListModal = ({
  isOpen,
  onClose,
  onPrint,
  serviceData,
  rollerData,
  specData,
  showArchived,
  customerName,
  siteName,
  location
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [columnFilters, setColumnFilters] = useState({});
  const { theme } = useContext(UIContext);
  const isDarkMode = theme === 'dark';

  if (!isOpen) return null;

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <Icons.ChevronsUpDown size={14} className="opacity-30" />;
    }
    return sortConfig.direction === 'ascending'
      ? <Icons.ChevronUp size={14} className="text-cyan-400" />
      : <Icons.ChevronDown size={14} className="text-cyan-400" />;
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (columnKey, selectedValues) => {
    setColumnFilters(prev => ({ ...prev, [columnKey]: selectedValues }));
  };

  // Get asset value for a given column key
  const getAssetValue = (asset, spec, key) => {
    switch (key) {
      case 'name': return asset.name || '';
      case 'code': return asset.code || '';
      case 'type': return asset.id.startsWith('s-') ? 'Service' : 'Roller';
      case 'lastCal': return asset.lastCal || '';
      case 'dueDate': return asset.dueDate || '';
      case 'scaleType': return spec?.scaleType || '-';
      case 'integrator': return spec?.integratorController || '-';
      case 'speedSensor': return spec?.speedSensorType || '-';
      case 'loadCell': return spec?.loadCellBrand || '-';
      case 'billetInfo': return spec?.billetWeightType || '-';
      case 'rollDims': return spec?.rollDims || '-';
      case 'adjustmentType': return spec?.adjustmentType || '-';
      default: return '';
    }
  };

  // Build enriched data with spec lookup
  const enrichedData = useMemo(() => {
    return [...serviceData, ...rollerData]
      .filter(asset => {
        if (!showArchived && asset.active === false) return false;
        return true;
      })
      .map(asset => {
        const spec = specData.find(s => s.weigher === asset.weigher || s.altCode === asset.code || s.weigher === asset.code);
        return { asset, spec };
      });
  }, [serviceData, rollerData, specData, showArchived]);

  // Build unique values for each filterable column
  const uniqueColumnValues = useMemo(() => {
    const columns = ['name', 'type', 'scaleType', 'integrator', 'speedSensor', 'loadCell', 'adjustmentType'];
    const result = {};
    columns.forEach(col => {
      const vals = [...new Set(enrichedData.map(({ asset, spec }) => getAssetValue(asset, spec, col)))].sort();
      result[col] = vals;
    });
    return result;
  }, [enrichedData]);

  const processedData = enrichedData
    .filter(({ asset, spec }) => {
      // Text search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || [
        asset.name, asset.code,
        spec?.scaleType, spec?.integratorController
      ].some(v => (v || '').toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Column filters
      for (const [key, selectedValues] of Object.entries(columnFilters)) {
        if (selectedValues && selectedValues.length < (uniqueColumnValues[key]?.length || 0)) {
          const val = getAssetValue(asset, spec, key);
          if (!selectedValues.includes(val)) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortConfig.key) {
        let aVal = getAssetValue(a.asset, a.spec, sortConfig.key);
        let bVal = getAssetValue(b.asset, b.spec, sortConfig.key);

        if (sortConfig.key === 'dueDate' || sortConfig.key === 'lastCal') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        } else {
          aVal = (aVal || '').toString().toLowerCase();
          bVal = (bVal || '').toString().toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

  const activeFilterCount = Object.entries(columnFilters).filter(
    ([key, vals]) => vals && vals.length < (uniqueColumnValues[key]?.length || 0)
  ).length;

  const headerClass = (clickable = true) =>
    `p-2 border-b whitespace-nowrap ${clickable ? 'cursor-pointer select-none' : ''} ${isDarkMode ? 'border-slate-700' : 'border-slate-700'} ${clickable ? (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100') : ''}`;

  return (
    <div id="master-list-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-800 border-slate-700'} rounded-lg shadow-2xl border w-full max-w-[95vw] h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 transition-colors`}>

        {/* HEADER */}
        <div className={`flex justify-between items-center p-4 border-b rounded-t-lg transition-colors ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-700 bg-gray-50'}`}>
          <div className="flex items-center gap-4">
            <img src="./logos/ai-logo.png" alt="Accurate Industries Logo" className="h-10" />
            <div>
              <h3 className={`font-bold text-xl flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Master Equipment List</h3>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Customer: {customerName || 'N/A'} | Site: {siteName || 'N/A'} | Location: {location || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {activeFilterCount > 0 && (
              <button
                onClick={() => setColumnFilters({})}
                className="text-xs text-amber-400 hover:text-amber-300 border border-amber-600 px-2 py-1 rounded"
              >
                Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </button>
            )}
            <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {processedData.length} of {enrichedData.length} assets
            </span>
            <button type="button" onClick={() => onPrint('master')} className={`${isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} mr-2`} title="Print Master List"><span className="text-xl"><Icons.Printer /></span></button>
            <div className="relative">
              <span className={`absolute left-2 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}><Icons.Search /></span>
              <input
                type="text"
                placeholder="Filter master list..."
                className={`pl-8 pr-4 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 ${isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-600 bg-slate-800 text-gray-800'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="button" onClick={onClose} className={`${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-800'}`}><span className="text-2xl"><Icons.X /></span></button>
          </div>
        </div>

        {/* TABLE */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-gray-50 text-gray-600'} sticky top-0 z-10 shadow-sm`}>
              <tr>
                <th className={headerClass()} onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Asset Name {getSortIcon('name')}
                    <ColumnFilter columnKey="name" uniqueValues={uniqueColumnValues.name || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
                <th className={headerClass()} onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">Code {getSortIcon('code')}</div>
                </th>
                <th className={headerClass()} onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">Type {getSortIcon('type')}
                    <ColumnFilter columnKey="type" uniqueValues={uniqueColumnValues.type || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
                <th className={headerClass()} onClick={() => handleSort('lastCal')}>
                  <div className="flex items-center gap-1">Last Cal {getSortIcon('lastCal')}</div>
                </th>
                <th className={headerClass()} onClick={() => handleSort('dueDate')}>
                  <div className="flex items-center gap-1">Cal Due {getSortIcon('dueDate')}</div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`} onClick={() => handleSort('scaleType')}>
                  <div className="flex items-center gap-1">Scale Type {getSortIcon('scaleType')}
                    <ColumnFilter columnKey="scaleType" uniqueValues={uniqueColumnValues.scaleType || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`} onClick={() => handleSort('integrator')}>
                  <div className="flex items-center gap-1">Integrator {getSortIcon('integrator')}
                    <ColumnFilter columnKey="integrator" uniqueValues={uniqueColumnValues.integrator || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`} onClick={() => handleSort('speedSensor')}>
                  <div className="flex items-center gap-1">Speed Sensor {getSortIcon('speedSensor')}
                    <ColumnFilter columnKey="speedSensor" uniqueValues={uniqueColumnValues.speedSensor || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`} onClick={() => handleSort('loadCell')}>
                  <div className="flex items-center gap-1">Load Cell {getSortIcon('loadCell')}
                    <ColumnFilter columnKey="loadCell" uniqueValues={uniqueColumnValues.loadCell || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`} onClick={() => handleSort('billetInfo')}>
                  <div className="flex items-center gap-1">Billet Info {getSortIcon('billetInfo')}</div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'}`} onClick={() => handleSort('rollDims')}>
                  <div className="flex items-center gap-1">Roller Dimensions {getSortIcon('rollDims')}</div>
                </th>
                <th className={`${headerClass()} ${isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50'}`} onClick={() => handleSort('adjustmentType')}>
                  <div className="flex items-center gap-1">Adj. Type {getSortIcon('adjustmentType')}
                    <ColumnFilter columnKey="adjustmentType" uniqueValues={uniqueColumnValues.adjustmentType || []} activeFilters={columnFilters} onFilterChange={handleFilterChange} isDarkMode={isDarkMode} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {processedData.map(({ asset, spec }) => {
                const typeLabel = asset.id.startsWith('s-') ? 'Service' : 'Roller';
                const typeColor = asset.id.startsWith('s-')
                  ? (isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800')
                  : (isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-800');

                const rowClass = asset.active === false
                  ? (isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-100 text-gray-400')
                  : (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-50');

                const textClass = isDarkMode ? 'text-slate-400' : 'text-gray-600';
                const mainTextClass = isDarkMode ? 'text-slate-200' : 'text-gray-800';

                return (
                  <tr key={asset.id} className={rowClass}>
                    <td className={`p-2 font-medium ${mainTextClass}`}>{asset.name} {asset.active === false && '(Archived)'}</td>
                    <td className={`p-2 font-mono ${textClass}`}>{asset.code}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${typeColor}`}>{typeLabel}</span></td>
                    <td className={`p-2 ${textClass}`}>{formatDate(asset.lastCal)}</td>
                    <td className={`p-2 font-medium ${textClass}`}>{formatDate(asset.dueDate)}</td>
                    <td className={`p-2 ${textClass} border-l ${isDarkMode ? 'border-slate-700' : 'border-slate-700'}`}>{spec?.scaleType || '-'}</td>
                    <td className={`p-2 ${textClass}`}>{spec?.integratorController || '-'}</td>
                    <td className={`p-2 ${textClass}`}>{spec?.speedSensorType || '-'}</td>
                    <td className={`p-2 ${textClass}`}>{spec?.loadCellBrand || '-'}</td>
                    <td className={`p-2 ${textClass}`}>
                      {spec?.billetWeightType && <div>{spec.billetWeightType}</div>}
                      {spec?.billetWeightSize && <div className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{spec.billetWeightSize}</div>}
                      {!spec?.billetWeightType && !spec?.billetWeightSize && '-'}
                    </td>
                    <td className={`p-2 font-mono ${textClass} border-l ${isDarkMode ? 'border-slate-700 bg-orange-900/10' : 'border-slate-700 bg-orange-50'}`}>{spec?.rollDims || '-'}</td>
                    <td className={`p-2 ${textClass} ${isDarkMode ? 'bg-orange-900/10' : 'bg-orange-50'}`}>{spec?.adjustmentType || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
