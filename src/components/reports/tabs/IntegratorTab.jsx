import React from 'react';
import { Icons } from '../../../constants/icons';

export const IntegratorTab = ({ formData, onChange, readOnly = false }) => {
    const integratorRows = formData.integratorRows || formData.integrator || [];

    const handleRowChange = (rowId, field, value) => {
        const updatedRows = integratorRows.map(row => {
            if (row.id !== rowId) return row;

            const updated = { ...row, [field]: value };

            // Auto-calculate difference
            if (field === 'asFound' || field === 'asLeft') {
                const asFound = parseFloat(field === 'asFound' ? value : row.asFound) || 0;
                const asLeft = parseFloat(field === 'asLeft' ? value : row.asLeft) || 0;
                updated.diff = (asLeft - asFound).toFixed(2);
            }

            return updated;
        });

        onChange('integratorRows', updatedRows);
    };

    const addRow = () => {
        const newRow = {
            id: Date.now(),
            label: 'New Parameter',
            asFound: '0',
            asLeft: '0',
            diff: '0'
        };
        onChange('integratorRows', [...integratorRows, newRow]);
    };

    const deleteRow = (rowId) => {
        onChange('integratorRows', integratorRows.filter(r => r.id !== rowId));
    };

    return (
        <fieldset disabled={readOnly} className="max-w-5xl mx-auto bg-slate-800 p-6 rounded-lg border border-slate-700 block">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Integrator Data</h3>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={addRow}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Icons.Plus size={14} /> Add Row
                    </button>
                )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 mb-2 text-xs font-bold text-slate-400 uppercase">
                <div>Parameter</div>
                <div>As Found</div>
                <div>As Left</div>
                <div>Difference</div>
                <div className="w-10"></div>
            </div>

            {/* Integrator Rows */}
            <div className="space-y-3">
                {integratorRows.map((row, index) => (
                    <div key={row.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center">
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
                        <div className={`font-mono font-bold p-2 rounded ${parseFloat(row.diff) !== 0 ? 'text-yellow-400' : 'text-slate-400'
                            }`}>
                            {row.diff}
                        </div>

                        {/* Delete Button */}
                        <div className="w-10">
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
                ))}
            </div>

            {integratorRows.length === 0 && (
                <div className="text-center text-slate-500 italic py-8">
                    No integrator data yet. Click "Add Row" to get started.
                </div>
            )}
        </fieldset>
    );
};
