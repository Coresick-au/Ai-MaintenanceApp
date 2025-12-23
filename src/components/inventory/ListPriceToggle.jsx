import React from 'react';
import { Icons } from '../../constants/icons';

/**
 * Toggle component for selecting list price source
 * @param {Object} props
 * @param {string} props.listPriceSource - Current selection: 'MANUAL' or 'CALCULATED'
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} [props.itemType='product'] - Item type: 'product' or 'part'
 */
export const ListPriceToggle = ({ listPriceSource, onChange, itemType = 'product' }) => {
    const costLabel = itemType === 'product' ? 'BOM Cost' : 'Cost Price';
    const sourceLabel = itemType === 'product' ? 'Calculated from BOM' : 'Calculated from Cost';

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
                List Price Source
            </label>

            <div className="space-y-2">
                {/* Manual Entry Option */}
                <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                        type="radio"
                        name="listPriceSource"
                        value="MANUAL"
                        checked={listPriceSource === 'MANUAL'}
                        onChange={(e) => onChange(e.target.value)}
                        className="mt-1 w-4 h-4 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Icons.Edit size={16} className="text-slate-400" />
                            <span className="font-medium text-white">Manual Entry</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Set a fixed list price that won't change automatically
                        </p>
                    </div>
                </label>

                {/* Calculated Option */}
                <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                        type="radio"
                        name="listPriceSource"
                        value="CALCULATED"
                        checked={listPriceSource === 'CALCULATED'}
                        onChange={(e) => onChange(e.target.value)}
                        className="mt-1 w-4 h-4 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Icons.Calculator size={16} className="text-cyan-400" />
                            <span className="font-medium text-white">{sourceLabel}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Automatically calculate: {costLabel} / (1 - Target Margin %)
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                            <Icons.CheckCircle size={12} className="text-green-400" />
                            <p className="text-xs text-green-400">
                                Updates when {itemType === 'product' ? 'part costs' : 'cost price'} change{itemType === 'product' ? 's' : 's'}
                            </p>
                        </div>
                    </div>
                </label>
            </div>
        </div>
    );
};
