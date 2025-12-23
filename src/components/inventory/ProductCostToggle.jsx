import React from 'react';
import { Icons } from '../../constants/icons';

/**
 * Toggle component for switching between Manual and Calculated product cost modes
 * @description Renders a radio button group allowing users to choose between manually
 * entering a product cost or calculating it from the Bill of Materials.
 * @param {Object} props - Component props
 * @param {string} props.costType - Current cost type ('MANUAL' or 'CALCULATED')
 * @param {Function} props.onChange - Callback when cost type changes
 * @param {Date} [props.lastCalculated] - Timestamp of last calculation (for CALCULATED mode)
 * @param {boolean} [props.disabled] - Whether the toggle is disabled
 * @returns {JSX.Element} Rendered toggle component
 */
export const ProductCostToggle = ({ costType, onChange, lastCalculated, disabled = false }) => {
    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
                Cost Calculation Method
            </label>

            <div className="grid grid-cols-2 gap-3">
                {/* Manual Cost Option */}
                <button
                    type="button"
                    onClick={() => !disabled && onChange('MANUAL')}
                    disabled={disabled}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${costType === 'MANUAL'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${costType === 'MANUAL'
                            ? 'border-cyan-500'
                            : 'border-slate-600'
                            }`}>
                            {costType === 'MANUAL' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                            )}
                        </div>
                    </div>
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                            <Icons.Edit size={16} className="text-slate-400" />
                            <span className="font-medium text-white">Manual Entry</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Enter a fixed cost price manually
                        </p>
                    </div>
                </button>

                {/* Calculated Cost Option */}
                <button
                    type="button"
                    onClick={() => !disabled && onChange('CALCULATED')}
                    disabled={disabled}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${costType === 'CALCULATED'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${costType === 'CALCULATED'
                            ? 'border-cyan-500'
                            : 'border-slate-600'
                            }`}>
                            {costType === 'CALCULATED' && (
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                            )}
                        </div>
                    </div>
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                            <Icons.Calculator size={16} className="text-slate-400" />
                            <span className="font-medium text-white">Calculate from BOM</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Sum of part costs × quantities
                        </p>
                        {costType === 'CALCULATED' && lastCalculated && (
                            <p className="text-xs text-emerald-400 mt-1">
                                Last calculated: {new Date(lastCalculated).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <Icons.Info size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                    {costType === 'MANUAL'
                        ? 'Manual costs remain fixed until you update them. They do not change when part costs change.'
                        : 'Calculated costs are derived from your Bill of Materials. They reflect the sum of all part costs at a specific point in time.'}
                </p>
            </div>
        </div>
    );
};
