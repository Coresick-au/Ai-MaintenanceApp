import React from 'react';
import { Icons } from '../../../constants/icons';

export const CalibrationTab = ({ formData, onChange, readOnly = false }) => {
    // Initialize calibration rows if not present (backward compatibility)
    const calibrationRows = formData.calibrationRows || [
        { id: 'tare', parameter: 'Tare (kg/m)', oldValue: formData.oldTare || '0.000', newValue: formData.newTare || '0.000', percentChange: null, isManual: false, isDefault: true },
        { id: 'span', parameter: 'Span / Factor', oldValue: formData.oldSpan || '1.000', newValue: formData.newSpan || '1.000', percentChange: null, isManual: false, isDefault: true },
        { id: 'speed', parameter: 'Speed (m/s)', oldValue: formData.oldSpeed || '0.00', newValue: formData.newSpeed || '0.00', percentChange: null, isManual: false, isDefault: true }
    ];

    const calculatePercent = (oldVal, newVal) => {
        const o = parseFloat(oldVal);
        const n = parseFloat(newVal);
        if (!o || o === 0) return '0.00';
        return (((n - o) / o) * 100).toFixed(2);
    };

    const handleRowChange = (rowId, field, value) => {
        const updatedRows = calibrationRows.map(row => {
            if (row.id !== rowId) return row;

            const updated = { ...row, [field]: value };

            // If old or new value changes, recalculate % (unless manual override is active)
            if ((field === 'oldValue' || field === 'newValue') && !row.isManual) {
                updated.percentChange = null; // Will auto-calculate
            }

            // If user edits percentChange, mark as manual
            if (field === 'percentChange') {
                updated.isManual = true;
            }

            return updated;
        });

        onChange('calibrationRows', updatedRows);
    };

    const addRow = () => {
        const newRow = {
            id: `custom-${Date.now()}`,
            parameter: 'New Parameter',
            oldValue: '0',
            newValue: '0',
            percentChange: null,
            isManual: false,
            isDefault: false
        };
        onChange('calibrationRows', [...calibrationRows, newRow]);
    };

    const deleteRow = (rowId) => {
        onChange('calibrationRows', calibrationRows.filter(r => r.id !== rowId));
    };

    const clearManualOverride = (rowId) => {
        const updatedRows = calibrationRows.map(row => {
            if (row.id !== rowId) return row;
            return { ...row, percentChange: null, isManual: false };
        });
        onChange('calibrationRows', updatedRows);
    };

    return (
        <fieldset disabled={readOnly} className="max-w-5xl mx-auto bg-slate-800 p-6 rounded-lg border border-slate-700 block">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Critical Calibration Results</h3>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={addRow}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Icons.Plus size={14} /> Add Parameter
                    </button>
                )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 mb-2 text-xs font-bold text-slate-400 uppercase">
                <div>Parameter</div>
                <div>Old (As Found)</div>
                <div>New (As Left)</div>
                <div>% Change</div>
                <div className="w-10"></div>
            </div>

            {/* Calibration Rows */}
            <div className="space-y-3">
                {calibrationRows.map(row => {
                    const autoPercent = calculatePercent(row.oldValue, row.newValue);
                    const displayPercent = row.isManual && row.percentChange !== null ? row.percentChange : autoPercent;
                    const percentValue = parseFloat(displayPercent);
                    const isHighChange = Math.abs(percentValue) > 1;

                    return (
                        <div key={row.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center">
                            {/* Parameter Name */}
                            <input
                                type="text"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white font-medium"
                                value={row.parameter}
                                onChange={e => handleRowChange(row.id, 'parameter', e.target.value)}
                                placeholder="Parameter name"
                            />

                            {/* Old Value */}
                            <input
                                type="number"
                                step="0.001"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={row.oldValue}
                                onChange={e => handleRowChange(row.id, 'oldValue', e.target.value)}
                            />

                            {/* New Value */}
                            <input
                                type="number"
                                step="0.001"
                                className="bg-slate-900 border border-slate-600 rounded p-2 text-white"
                                value={row.newValue}
                                onChange={e => handleRowChange(row.id, 'newValue', e.target.value)}
                            />

                            {/* % Change (Editable) */}
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    className={`w-full bg-slate-900 border rounded p-2 font-mono font-bold ${isHighChange ? 'text-red-400 border-red-600' : 'text-green-400 border-slate-600'
                                        } ${row.isManual ? 'border-blue-500' : ''}`}
                                    value={displayPercent}
                                    onChange={e => handleRowChange(row.id, 'percentChange', e.target.value)}
                                    title={row.isManual ? 'Manual override active' : 'Auto-calculated'}
                                />
                                {row.isManual && (
                                    <button
                                        type="button"
                                        onClick={() => clearManualOverride(row.id)}
                                        className="absolute -right-2 -top-2 bg-blue-600 text-white rounded-full p-0.5 hover:bg-blue-500"
                                        title="Clear manual override"
                                    >
                                        <Icons.RotateCcw size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Delete Button */}
                            <div className="w-10">
                                {!row.isDefault && !readOnly && (
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

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-700 flex gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded"></div>
                    <span>Normal change (&lt;1%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded"></div>
                    <span>High change (&gt;1%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-blue-500 rounded"></div>
                    <span>Manual override</span>
                </div>
            </div>
        </fieldset>
    );
};
