
import type { Rates } from '../types';
import { Lock, Unlock, Calculator, PlusCircle, Save, RotateCcw, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface RatesConfigProps {
    rates: Rates;
    setRates: (rates: Rates) => void;
    saveAsDefaults?: (rates: Rates) => void;
    resetToDefaults?: () => void;
    isLocked?: boolean;
}

export default function RatesConfig({ rates, setRates, saveAsDefaults, resetToDefaults, isLocked: propIsLocked = false }: RatesConfigProps) {
    const [isLocked, setIsLocked] = useState(propIsLocked);
    const [calcKm, setCalcKm] = useState<number>(0);
    const [calcHours, setCalcHours] = useState<number>(0);
    const [hasBeenUnlocked, setHasBeenUnlocked] = useState(false);
    
    // Profit Target State
    const [targetMargin, setTargetMargin] = useState<number>(0);

    const handleUnlock = () => {
        // Only show confirmation if this was manually locked before (not initial state)
        if (hasBeenUnlocked || isLocked) {
            if (confirm("Are you sure you want to edit rates? These are typically fixed once set up for a customer.")) {
                setIsLocked(false);
                setHasBeenUnlocked(true);
            }
        } else {
            // First time unlocking from initial state, no confirmation needed
            setIsLocked(false);
            setHasBeenUnlocked(true);
        }
    };

    const handleLock = () => {
        setIsLocked(true);
    };

    const calculateTotal = () => {
        return (calcHours * rates.travel) + (calcKm * rates.travelCharge);
    };

    const addToExBrisbane = () => {
        const amountToAdd = calculateTotal();
        if (amountToAdd > 0) {
            setRates({
                ...rates,
                travelChargeExBrisbane: parseFloat((rates.travelChargeExBrisbane + amountToAdd).toFixed(2))
            });
            // Reset calculator inputs
            setCalcKm(0);
            setCalcHours(0);
        }
    };

    const handleSaveDefaults = () => {
        if (saveAsDefaults && confirm("Are you sure you want to set these rates as the new SYSTEM DEFAULTS? All new quotes will use these rates.")) {
            saveAsDefaults(rates);
            alert("New default rates saved.");
        }
    };

    const handleResetDefaults = () => {
        if (resetToDefaults && confirm("Are you sure you want to reset these rates to the SYSTEM DEFAULTS? This will overwrite current changes.")) {
            resetToDefaults();
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Current Quote Rates Configuration</h2>
                    <p className="text-sm text-slate-400 mt-1">Rates configured here apply exclusively to the current active quote and will not modify customer default profiles.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Default Management Buttons */}
                    {!isLocked && (saveAsDefaults || resetToDefaults) && (
                        <div className="flex items-center gap-2 mr-4 border-r pr-4 border-gray-600">
                            {resetToDefaults && (
                                <button
                                    onClick={handleResetDefaults}
                                    className="text-slate-400 hover:text-primary-400 px-3 py-2 rounded text-sm font-medium flex items-center gap-1 hover:bg-gray-700"
                                    title="Load system default rates"
                                >
                                    <RotateCcw size={16} /> Load Defaults
                                </button>
                            )}
                            {saveAsDefaults && (
                                <button
                                    onClick={handleSaveDefaults}
                                    className="text-slate-400 hover:text-primary-400 px-3 py-2 rounded text-sm font-medium flex items-center gap-1 hover:bg-gray-700"
                                    title="Save current rates as system defaults"
                                >
                                    <Save size={16} /> Set as Defaults
                                </button>
                            )}
                        </div>
                    )}

                    {isLocked ? (
                        <button
                            onClick={handleUnlock}
                            className="bg-amber-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-amber-700 font-medium"
                        >
                            <Unlock size={18} /> Unlock to Edit
                        </button>
                    ) : (
                        <button
                            onClick={handleLock}
                            className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 font-medium"
                        >
                            <Lock size={18} /> Lock Rates
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Labor Rates */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wide border-b border-gray-600 pb-2">Labor Rates</h3>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Site Normal Working Hours - First 7.5hrs</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="1"
                                value={rates.siteNormal}
                                onChange={(e) => setRates({ ...rates, siteNormal: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/hr</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Site Overtime Rate - After 7.5 Normal Working Hours</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="1"
                                value={rates.siteOvertime}
                                onChange={(e) => setRates({ ...rates, siteOvertime: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/hr</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Saturday/Sunday</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="1"
                                value={rates.weekend}
                                onChange={(e) => setRates({ ...rates, weekend: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/hr</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Public Holidays</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="1"
                                value={rates.publicHoliday}
                                onChange={(e) => setRates({ ...rates, publicHoliday: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/hr</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Office Reporting Time</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="1"
                                value={rates.officeReporting}
                                onChange={(e) => setRates({ ...rates, officeReporting: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/hr</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Internal Cost of Labor (Per Hr)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="1"
                                value={rates.costOfLabour}
                                onChange={(e) => setRates({ ...rates, costOfLabour: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/hr</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Internal cost for margin calculation (not billed to customer)</p>
                    </div>
                </div>

                {/* Travel & Allowances */}
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wide border-b border-gray-600 pb-2">Allowances & Other</h3>

                        {/* Moved Travel Rate and Travel Charge to Calculator section below */}

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Travel Charge ex Brisbane</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">$</span>
                                <input
                                    disabled={isLocked}
                                    type="number"
                                    step="0.01"
                                    value={rates.travelChargeExBrisbane}
                                    onChange={(e) => setRates({ ...rates, travelChargeExBrisbane: parseFloat(e.target.value) || 0 })}
                                    className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                                    placeholder="Input Value"
                                />
                                <span className="text-slate-400">/tech</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Site Vehicle</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">$</span>
                                <input
                                    disabled={isLocked}
                                    type="number"
                                    step="1"
                                    value={rates.vehicle}
                                    onChange={(e) => setRates({ ...rates, vehicle: parseFloat(e.target.value) || 0 })}
                                    className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                                />
                                <span className="text-slate-400">/day</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Technician Overnight Allowance</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">$</span>
                                <input
                                    disabled={isLocked}
                                    type="number"
                                    step="1"
                                    value={rates.perDiem}
                                    onChange={(e) => setRates({ ...rates, perDiem: parseFloat(e.target.value) || 0 })}
                                    className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                                />
                                <span className="text-slate-400">/night</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Standard Day Rate (12hrs)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">$</span>
                                <input
                                    disabled
                                    type="number"
                                    value={(rates.siteNormal * 7.5) + (rates.siteOvertime * 4.5)}
                                    className="border border-gray-600 rounded p-2 w-full bg-gray-600 text-slate-400 font-medium cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Calculated: (7.5h × Normal) + (4.5h × OT)</p>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-300 mb-1">Weekend Day Rate (12hrs)</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">$</span>
                                <input
                                    disabled
                                    type="number"
                                    value={rates.weekend * 12}
                                    className="border border-gray-600 rounded p-2 w-full bg-gray-600 text-slate-400 font-medium cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Calculated: 12h × Weekend Rate</p>
                        </div>
                    </div>

                    {/* Profit Target Calculator */}
                    <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 mb-3">
                            <TrendingUp size={16} /> Profit Target
                        </h3>
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Target Margin %</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={targetMargin || ''}
                                        onChange={(e) => setTargetMargin(parseFloat(e.target.value) || 0)}
                                        className="w-20 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 outline-none focus:border-primary-500"
                                    />
                                    <span className="text-slate-400 text-sm">%</span>
                                </div>
                            </div>
                            <div className="pb-2 text-slate-500">→</div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Required Multiplier</label>
                                <div className="py-2 px-3 bg-gray-800 rounded border border-gray-600 text-slate-100 font-mono min-w-[80px] text-center">
                                    {targetMargin > 0 && targetMargin < 100 
                                        ? (1 / (1 - (targetMargin / 100))).toFixed(3) + 'x'
                                        : '-'}
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Multiplier = 1 / (1 - Margin%). Example: 20% Margin requires 1.25x markup.
                        </p>
                    </div>
                </div>
            </div>

            {/* Travel Calculator */}
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-slate-200 text-sm mb-4 flex items-center gap-2">
                    <Calculator size={16} /> Travel Rates & Calculator
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Travel Charge</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">$</span>
                            <input
                                disabled={isLocked}
                                type="number"
                                step="0.01"
                                value={rates.travelCharge}
                                onChange={(e) => setRates({ ...rates, travelCharge: parseFloat(e.target.value) || 0 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">/km</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-600 pt-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Calculate Trip Cost</h4>
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Hours</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={calcHours || ''}
                                    className="w-20 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100"
                                    onChange={(e) => setCalcHours(parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-slate-400 text-sm">hrs</span>
                            </div>
                        </div>
                        <div className="pb-2 text-slate-500">+</div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Distance</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={calcKm || ''}
                                    className="w-24 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100"
                                    onChange={(e) => setCalcKm(parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-slate-400 text-sm">km</span>
                            </div>
                        </div>
                        <div className="pb-2 text-slate-500">=</div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Total</label>
                            <div className="py-2 px-3 bg-gray-700 rounded border border-gray-600 text-slate-100 font-bold min-w-[100px]">
                                {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(calculateTotal())}
                            </div>
                        </div>

                        <button
                            onClick={addToExBrisbane}
                            disabled={isLocked || (calcKm <= 0 && calcHours <= 0)}
                            className="mb-0.5 bg-primary-600 text-white px-4 py-2 rounded shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                        >
                            <PlusCircle size={16} /> Add to Ex-Brisbane
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Calculates (Hours × Travel Rate) + (Distance × Travel Charge) and adds it to the "Travel Charge ex Brisbane" field.
                    </p>
                </div>
            </div>
        </div>
    );
}
