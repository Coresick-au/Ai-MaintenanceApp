
import type { Rates, CopyTemplateSettings } from '../types';
import { Lock, Unlock, Calculator, PlusCircle, Save, RotateCcw, TrendingUp, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from './Toast';

interface RatesConfigProps {
    rates: Rates;
    setRates: (rates: Rates) => void;
    saveAsDefaults?: (rates: Rates) => void;
    resetToDefaults?: () => void;
    isLocked?: boolean;
    lockedAt?: string; // ISO timestamp of when rates were locked
    onLockChange?: (isLocked: boolean) => void;
    /** Compact mode hides the main header - use when nested inside another panel */
    compact?: boolean;
    /** Customer-specific save button props */
    onSaveCustomer?: () => void;
    hasUnsavedChanges?: boolean;
    saveSuccess?: boolean;
    /** Custom title for the rates section */
    title?: string;
    /** Custom description for the rates section */
    description?: string;
}

export default function RatesConfig({ rates, setRates, saveAsDefaults, resetToDefaults, isLocked: propIsLocked = false, lockedAt, onLockChange, compact = false, onSaveCustomer, hasUnsavedChanges = false, saveSuccess = false, title, description }: RatesConfigProps) {
    const { showToast } = useToast();
    const [isLocked, setIsLocked] = useState(propIsLocked);
    const [calcKm, setCalcKm] = useState<number>(0);
    const [calcHours, setCalcHours] = useState<number>(0);
    const [hasBeenUnlocked, setHasBeenUnlocked] = useState(false);

    // Profit Target State
    const [targetMargin, setTargetMargin] = useState<number>(0);

    // Sync local lock state with prop when it changes (e.g., after page refresh)
    useEffect(() => {
        setIsLocked(propIsLocked);
    }, [propIsLocked]);

    const handleUnlock = () => {
        // Only show confirmation if this was manually locked before (not initial state)
        if (hasBeenUnlocked || isLocked) {
            if (confirm("Are you sure you want to edit rates? These are typically fixed once set up for a customer.")) {
                setIsLocked(false);
                setHasBeenUnlocked(true);
                onLockChange?.(false);
            }
        } else {
            // First time unlocking from initial state, no confirmation needed
            setIsLocked(false);
            setHasBeenUnlocked(true);
            onLockChange?.(false);
        }
    };

    const handleLock = () => {
        setIsLocked(true);
        onLockChange?.(true);
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
            showToast("New default rates saved.", "success");
        }
    };

    const handleResetDefaults = () => {
        if (resetToDefaults && confirm("Are you sure you want to reset these rates to the SYSTEM DEFAULTS? This will overwrite current changes.")) {
            resetToDefaults();
        }
    };

    return (
        <div className={compact ? '' : 'bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700'}>
            {/* Header - hidden in compact mode */}
            {!compact && (
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                        <div>
                            <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">
                                {title || 'Current Quote Rates Configuration'}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {description || 'Rates configured here apply exclusively to the current active quote and will not modify customer default profiles.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Default Management Buttons */}
                            {!isLocked && (saveAsDefaults || resetToDefaults) && (
                                <div className="flex items-center gap-2 mr-4 border-r pr-4 border-gray-600">
                                    {resetToDefaults && (
                                        <button
                                            onClick={handleResetDefaults}
                                            className="text-slate-400 hover:text-primary-400 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 hover:bg-gray-700"
                                            title="Load system default rates"
                                        >
                                            <RotateCcw size={16} /> Load Defaults
                                        </button>
                                    )}
                                    {saveAsDefaults && (
                                        <button
                                            onClick={handleSaveDefaults}
                                            className="text-slate-400 hover:text-primary-400 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 hover:bg-gray-700"
                                            title="Save current rates as system defaults"
                                        >
                                            <Save size={16} /> Set as Defaults
                                        </button>
                                    )}
                                </div>
                            )}

                            {onSaveCustomer && (
                                <button
                                    onClick={onSaveCustomer}
                                    className={`px-4 py-2 rounded flex items-center gap-1.5 font-medium text-sm text-white transition-all min-w-[100px] justify-center ${
                                        saveSuccess ? 'bg-emerald-600 hover:bg-emerald-700' :
                                        hasUnsavedChanges ? 'bg-amber-600 hover:bg-amber-500 animate-pulse' :
                                        'bg-primary-600 hover:bg-primary-500'
                                    }`}
                                >
                                    {saveSuccess ? <><Check size={16} /> Saved!</> :
                                     hasUnsavedChanges ? <><Save size={16} /> Save</> :
                                     <><Save size={16} /> Save</>}
                                </button>
                            )}

                            {isLocked ? (
                                <button
                                    onClick={handleUnlock}
                                    className="bg-slate-600 text-white px-4 py-2 rounded flex items-center gap-1.5 hover:bg-slate-500 font-medium text-sm min-w-[100px] justify-center"
                                >
                                    <Unlock size={16} /> Unlock
                                </button>
                            ) : (
                                <button
                                    onClick={handleLock}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-1.5 hover:bg-emerald-700 font-medium text-sm min-w-[100px] justify-center"
                                >
                                    <Lock size={16} /> Lock
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Locked timestamp - below buttons */}
                    {isLocked && lockedAt && (
                        <div className="flex justify-end">
                            <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                                🔒 Locked: {new Date(lockedAt).toLocaleString('en-AU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}
                </div>
            )}

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
                        <label className="block text-sm text-slate-300 mb-1">Normal Hours Threshold (before OT)</label>
                        <div className="flex items-center gap-2">
                            <input
                                disabled={isLocked}
                                type="number"
                                step="0.5"
                                value={rates.overtimeThreshold}
                                onChange={(e) => setRates({ ...rates, overtimeThreshold: parseFloat(e.target.value) || 7.5 })}
                                className={`border border-gray-600 rounded p-2 w-full bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                            />
                            <span className="text-slate-400">hrs</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Hours before overtime kicks in (default: 7.5)</p>
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
                            <label className="block text-sm text-slate-300 mb-1">Travel Charge Location & Amount</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-sm whitespace-nowrap">ex</span>
                                    <input
                                        disabled={isLocked}
                                        type="text"
                                        value={rates.travelChargeLocation || 'Brisbane'}
                                        onChange={(e) => setRates({ ...rates, travelChargeLocation: e.target.value })}
                                        className={`border border-gray-600 rounded p-2 flex-1 bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50 text-slate-400' : ''}`}
                                        placeholder="e.g. Brisbane, Mackay, Rockhampton"
                                    />
                                </div>
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
                                <div className="text-2xl font-bold text-primary-400 font-mono">
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
                            <PlusCircle size={16} /> Add to Travel Charge
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Calculates (Hours × Travel Rate) + (Distance × Travel Charge) and adds it to the "Travel Charge ex {rates.travelChargeLocation || 'Brisbane'}" field.
                    </p>
                </div>

                {/* Standard Expenses Templates */}
                <div className="col-span-2 bg-gray-700/50 p-4 rounded border border-gray-600 mt-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        📋 Standard Recurring Expenses
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                        Define standard expenses for this customer that can be quickly added to quotes (e.g., flights, accommodation).
                    </p>

                    <div className="space-y-3">
                        {(rates.standardExpenses || []).map((expense, index) => (
                            <div key={expense.id} className="flex items-center gap-2">
                                <input
                                    disabled={isLocked}
                                    type="text"
                                    placeholder="Description (e.g., Flights)"
                                    value={expense.description}
                                    onChange={(e) => {
                                        const updated = [...(rates.standardExpenses || [])];
                                        updated[index] = { ...expense, description: e.target.value };
                                        setRates({ ...rates, standardExpenses: updated });
                                    }}
                                    className={`flex-1 border border-gray-600 rounded p-2 bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                />
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400 text-sm">$</span>
                                    <input
                                        disabled={isLocked}
                                        type="number"
                                        placeholder="Cost"
                                        value={expense.cost}
                                        onChange={(e) => {
                                            const updated = [...(rates.standardExpenses || [])];
                                            updated[index] = { ...expense, cost: parseFloat(e.target.value) || 0 };
                                            setRates({ ...rates, standardExpenses: updated });
                                        }}
                                        className={`w-28 border border-gray-600 rounded p-2 bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                                    />
                                </div>
                                <button
                                    disabled={isLocked}
                                    onClick={() => {
                                        const updated = (rates.standardExpenses || []).filter((_, i) => i !== index);
                                        setRates({ ...rates, standardExpenses: updated });
                                    }}
                                    className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}

                        <button
                            disabled={isLocked}
                            onClick={() => {
                                const newExpense = {
                                    id: `exp-${Date.now()}`,
                                    description: '',
                                    cost: 0
                                };
                                setRates({ ...rates, standardExpenses: [...(rates.standardExpenses || []), newExpense] });
                            }}
                            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-slate-200 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + Add Standard Expense
                        </button>
                    </div>
                </div>
            </div>

            {/* Copy Template Settings */}
            <CopyTemplateSettingsSection
                settings={rates.copyTemplateSettings}
                onChange={(updated) => setRates({ ...rates, copyTemplateSettings: updated })}
                isLocked={isLocked}
            />
        </div>
    );
}

const DEFAULT_COPY_TEMPLATE: CopyTemplateSettings = {
    quoteIntro: '',
    quoteIncludeSchedule: true,
    quoteIncludeLineItems: true,
    quoteIncludeTechNotes: false,
    quoteOutro: '',
    invoiceGreeting: 'Hi Admin,',
    invoiceIncludeSchedule: true,
    invoiceIncludeBreakdown: true,
    invoiceIncludeVariance: true,
};

function CopyTemplateSettingsSection({ settings, onChange, isLocked }: {
    settings?: CopyTemplateSettings;
    onChange: (settings: CopyTemplateSettings) => void;
    isLocked: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const s = { ...DEFAULT_COPY_TEMPLATE, ...settings };

    const update = (field: keyof CopyTemplateSettings, value: any) => {
        onChange({ ...s, [field]: value });
    };

    const toggleClass = "w-4 h-4 rounded border-gray-500 bg-gray-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-gray-800";
    const inputClass = `w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none ${isLocked ? 'bg-gray-600 opacity-50' : ''}`;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 mt-6">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wide flex items-center gap-2">
                    Copy Template Settings
                </h3>
                <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            <p className="text-xs text-slate-400 mt-1 mb-2">
                Customize what gets included when copying quote or invoice text.
            </p>

            <div className={expanded ? '' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Quote Copy Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-300 border-b border-gray-600 pb-1">Quote Copy</h4>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Intro Text (before scope)</label>
                            <textarea
                                disabled={isLocked}
                                value={s.quoteIntro}
                                onChange={(e) => update('quoteIntro', e.target.value)}
                                className={`${inputClass} h-20`}
                                placeholder='e.g. "Hi Jo, See the below quotation..."'
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={s.quoteIncludeSchedule}
                                    onChange={(e) => update('quoteIncludeSchedule', e.target.checked)}
                                    className={toggleClass}
                                />
                                <span className="text-sm text-slate-300">Include day schedule</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={s.quoteIncludeLineItems}
                                    onChange={(e) => update('quoteIncludeLineItems', e.target.checked)}
                                    className={toggleClass}
                                />
                                <span className="text-sm text-slate-300">Include line items breakdown</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={s.quoteIncludeTechNotes}
                                    onChange={(e) => update('quoteIncludeTechNotes', e.target.checked)}
                                    className={toggleClass}
                                />
                                <span className="text-sm text-slate-300">Include tech notes</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Closing Text (after content)</label>
                            <textarea
                                disabled={isLocked}
                                value={s.quoteOutro}
                                onChange={(e) => update('quoteOutro', e.target.value)}
                                className={`${inputClass} h-20`}
                                placeholder='e.g. "If you have any questions, please do not hesitate to contact me."'
                            />
                        </div>
                    </div>

                    {/* Invoice Copy Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-300 border-b border-gray-600 pb-1">Invoice Copy</h4>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Greeting</label>
                            <input
                                type="text"
                                disabled={isLocked}
                                value={s.invoiceGreeting}
                                onChange={(e) => update('invoiceGreeting', e.target.value)}
                                className={inputClass}
                                placeholder="Hi Admin,"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={s.invoiceIncludeSchedule}
                                    onChange={(e) => update('invoiceIncludeSchedule', e.target.checked)}
                                    className={toggleClass}
                                />
                                <span className="text-sm text-slate-300">Include day schedule</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={s.invoiceIncludeBreakdown}
                                    onChange={(e) => update('invoiceIncludeBreakdown', e.target.checked)}
                                    className={toggleClass}
                                />
                                <span className="text-sm text-slate-300">Include financial breakdown</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    disabled={isLocked}
                                    checked={s.invoiceIncludeVariance}
                                    onChange={(e) => update('invoiceIncludeVariance', e.target.checked)}
                                    className={toggleClass}
                                />
                                <span className="text-sm text-slate-300">Include variance notes</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
