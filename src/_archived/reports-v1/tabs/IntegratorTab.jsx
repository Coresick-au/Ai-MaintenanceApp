import React from 'react';
import { Icons } from '../../../constants/icons';

export const IntegratorTab = ({ formData, onChange, readOnly = false }) => {
    const integratorRows = formData.integratorRows || formData.integrator || [];

    const handleRowChange = (rowId, field, value) => {
        const updatedRows = integratorRows.map(row => {
            if (row.id !== rowId) return row;

            const updated = { ...row, [field]: value };

            // Auto-calculate difference and percentage
            if (field === 'asFound' || field === 'asLeft') {
                const asFound = parseFloat(field === 'asFound' ? value : row.asFound) || 0;
                const asLeft = parseFloat(field === 'asLeft' ? value : row.asLeft) || 0;
                updated.diff = (asLeft - asFound).toFixed(2);

                // Calculate percentage change
                if (asFound !== 0) {
                    updated.percentChange = (((asLeft - asFound) / asFound) * 100).toFixed(2);
                } else {
                    updated.percentChange = asLeft !== 0 ? 'N/A' : '0.00';
                }
            }

            return updated;
        });

        onChange('integratorRows', updatedRows);
    };

    const togglePercentage = (rowId) => {
        const updatedRows = integratorRows.map(row => {
            if (row.id !== rowId) return row;
            return { ...row, showPercentage: !row.showPercentage };
        });
        onChange('integratorRows', updatedRows);
    };

    const addRow = () => {
        const newRow = {
            id: Date.now(),
            label: 'New Parameter',
            asFound: '0',
            asLeft: '0',
            diff: '0',
            percentChange: '0.00',
            showPercentage: false
        };
        onChange('integratorRows', [...integratorRows, newRow]);
    };

    const deleteRow = (rowId) => {
        onChange('integratorRows', integratorRows.filter(r => r.id !== rowId));
    };

    return (
        <fieldset disabled={readOnly} className="w-full mx-auto bg-slate-800 p-6 rounded-lg border border-slate-700 block overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Integrator Data</h3>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={addRow}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus" aria-hidden="true">
                            <path d="M5 12h14"></path>
                            <path d="M12 5v14"></path>
                        </svg>
                        Add Parameter
                    </button>
                )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(110px,110px)_minmax(40px,40px)] gap-3 mb-2 text-xs font-bold text-slate-400 uppercase">
                <div>Parameter</div>
                <div>As Found</div>
                <div>As Left</div>
                <div>Difference</div>
                <div className="flex items-center gap-1">
                    % Change
                </div>
                <div className="w-10"></div>
            </div>

            {/* Integrator Rows */}
            <div className="space-y-3">
                {integratorRows.map((row, index) => {
                    // Calculate percentage for display
                    const asFound = parseFloat(row.asFound) || 0;
                    const asLeft = parseFloat(row.asLeft) || 0;
                    let percentDisplay = '0.00';

                    if (asFound !== 0) {
                        percentDisplay = (((asLeft - asFound) / asFound) * 100).toFixed(2);
                    } else if (asLeft !== 0) {
                        percentDisplay = 'N/A';
                    }

                    const percentValue = parseFloat(percentDisplay);
                    const isValidPercent = !isNaN(percentValue);

                    return (
                        <div key={row.id} className="grid grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_minmax(100px,1fr)_minmax(90px,1fr)_minmax(110px,110px)_minmax(40px,40px)] gap-3 items-center">
                            {/* Label */}
                            <input
                                type="text"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white font-medium"
                                value={row.label}
                                onChange={e => handleRowChange(row.id, 'label', e.target.value)}
                                placeholder="Parameter name"
                            />

                            {/* As Found */}
                            <input
                                type="text"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={row.asFound}
                                onChange={e => handleRowChange(row.id, 'asFound', e.target.value)}
                            />

                            {/* As Left */}
                            <input
                                type="text"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={row.asLeft}
                                onChange={e => handleRowChange(row.id, 'asLeft', e.target.value)}
                            />

                            {/* Difference (Auto-calculated) */}
                            <div className={`font-mono font-bold p-2 rounded text-center ${parseFloat(row.diff) !== 0 ? 'text-yellow-400' : 'text-slate-400'
                                }`}>
                                {row.diff}
                            </div>

                            {/* Percentage Toggle & Display */}
                            <div className="flex items-center gap-1.5">
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={() => togglePercentage(row.id)}
                                        className={`p-1.5 rounded transition-all text-xs font-bold flex-shrink-0 ${row.showPercentage
                                            ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                            }`}
                                        title={row.showPercentage ? 'Hide percentage' : 'Show percentage'}
                                    >
                                        %
                                    </button>
                                )}
                                {row.showPercentage && (
                                    <div className={`font-mono font-bold text-xs whitespace-nowrap ${!isValidPercent ? 'text-slate-500' :
                                        percentValue > 0 ? 'text-green-400' :
                                            percentValue < 0 ? 'text-red-400' :
                                                'text-slate-400'
                                        }`}>
                                        {percentDisplay}{isValidPercent ? '%' : ''}
                                    </div>
                                )}
                            </div>

                            {/* Delete Button */}
                            <div className="w-10 flex justify-center">
                                {!readOnly && integratorRows.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => deleteRow(row.id)}
                                        className="p-1.5 text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                        title="Delete row"
                                    >
                                        <Icons.Trash size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {integratorRows.length === 0 && (
                <div className="text-center text-slate-500 italic py-8">
                    No integrator data yet. Click "Add Parameter" to get started.
                </div>
            )}
        </fieldset>
    );
};
