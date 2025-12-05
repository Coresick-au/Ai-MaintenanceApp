import React, { useState, useContext } from 'react';
import { Icons } from '../constants/icons.jsx';
import { formatDate } from '../utils/helpers';
import { UIContext } from '../context/UIContext';

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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const { theme } = useContext(UIContext);
  const isDarkMode = theme === 'dark';

  if (!isOpen) return null;

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'ascending' ? <Icons.SortAsc /> : <Icons.SortDesc />;
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedData = [...serviceData, ...rollerData]
    .filter(asset => {
      const searchLower = searchTerm.toLowerCase();
      const spec = specData.find(s => s.weigher === asset.weigher || s.altCode === asset.code || s.weigher === asset.code);

      if (!showArchived && asset.active === false) return false;

      return (
        (asset.name || '').toLowerCase().includes(searchLower) ||
        (asset.code || '').toLowerCase().includes(searchLower) ||
        (spec?.scaleType || '').toLowerCase().includes(searchLower) ||
        (spec?.integratorController || '').toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortConfig.key) {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'dueDate' || sortConfig.key === 'lastCal') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      }
      return a.name.localeCompare(b.name);
    });

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
                <th className={`p-2 border-b cursor-pointer ${isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-700 hover:bg-gray-100'}`} onClick={() => handleSort('name')}>Asset Name {getSortIcon('name')}</th>
                <th className={`p-2 border-b cursor-pointer ${isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-700 hover:bg-gray-100'}`} onClick={() => handleSort('code')}>Code {getSortIcon('code')}</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-700'}`}>Type</th>
                <th className={`p-2 border-b cursor-pointer ${isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-700 hover:bg-gray-100'}`} onClick={() => handleSort('lastCal')}>Last Cal {getSortIcon('lastCal')}</th>
                <th className={`p-2 border-b cursor-pointer ${isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-700 hover:bg-gray-100'}`} onClick={() => handleSort('dueDate')}>Cal Due {getSortIcon('dueDate')}</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-blue-900/20' : 'border-slate-700 bg-blue-50'}`}>Scale Type</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-blue-900/20' : 'border-slate-700 bg-blue-50'}`}>Integrator</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-blue-900/20' : 'border-slate-700 bg-blue-50'}`}>Speed Sensor</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-blue-900/20' : 'border-slate-700 bg-blue-50'}`}>Load Cell</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-blue-900/20' : 'border-slate-700 bg-blue-50'}`}>Billet Info</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-orange-900/20' : 'border-slate-700 bg-orange-50'}`}>Roller Dimensions (Dia x Face x B2B x Total x Shaft x Slot (#) Adjustment Type)</th>
                <th className={`p-2 border-b ${isDarkMode ? 'border-slate-700 bg-orange-900/20' : 'border-slate-700 bg-orange-50'}`}>Adjustment Type</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {processedData.map(asset => {
                const spec = specData.find(s => s.weigher === asset.weigher || s.altCode === asset.code || s.weigher === asset.code);
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
