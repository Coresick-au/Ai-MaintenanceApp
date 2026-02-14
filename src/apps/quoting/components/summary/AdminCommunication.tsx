import { ExternalLink } from 'lucide-react';
import type { useQuote } from '../../hooks/useQuote';
import { formatMoney } from '../../utils/formatters';

interface AdminCommunicationProps {
    quote: ReturnType<typeof useQuote>;
}

export default function AdminCommunication({ quote }: AdminCommunicationProps) {
    const { jobDetails, isLocked, totalCost, extras } = quote;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Job Number
                    </label>
                    <input
                        type="text"
                        value={jobDetails.jobNo || ''}
                        onChange={(e) => quote.setJobDetails({ ...jobDetails, jobNo: e.target.value })}
                        className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="e.g. J123456"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        External Link
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={jobDetails.externalLink || ''}
                            onChange={(e) => quote.setJobDetails({ ...jobDetails, externalLink: e.target.value })}
                            className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="https://..."
                        />
                        {jobDetails.externalLink && (
                            <button
                                onClick={() => window.open(jobDetails.externalLink, '_blank')}
                                className="p-2 bg-gray-700 text-slate-300 rounded hover:bg-gray-600"
                                title="Open Link"
                            >
                                <ExternalLink size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Additional Comments
                </label>
                <textarea
                    value={jobDetails.adminComments || ''}
                    onChange={(e) => quote.setJobDetails({ ...jobDetails, adminComments: e.target.value })}
                    disabled={isLocked}
                    className={`w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none h-20 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                    placeholder="Additional notes for admin..."
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Original Quote Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                        <input
                            type="text"
                            value={jobDetails.originalQuoteAmount ? formatMoney(jobDetails.originalQuoteAmount) : 'Not yet quoted'}
                            disabled
                            className="w-full pl-7 p-2 border border-gray-600 rounded bg-gray-600 text-slate-300 outline-none opacity-75 cursor-not-allowed"
                            title="Auto-captured when quote status is set to 'Quoted'"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Auto-captured when marked as "Quoted"</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        PO Amount
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                            <input
                                type="number"
                                value={jobDetails.poAmount || ''}
                                onChange={(e) => quote.setJobDetails({ ...jobDetails, poAmount: parseFloat(e.target.value) || undefined })}
                                className="w-full pl-7 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        {(() => {
                            const existingAdjustment = extras.find(e => e.description === 'PO Adjustment');
                            const hasVariance = jobDetails.poAmount && Math.abs(totalCost - jobDetails.poAmount) > 0.01;

                            if (existingAdjustment) {
                                return (
                                    <button
                                        onClick={() => {
                                            quote.removeExtra(existingAdjustment.id);
                                        }}
                                        className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 whitespace-nowrap font-medium"
                                        title="Remove PO adjustment"
                                    >
                                        Remove Adjustment
                                    </button>
                                );
                            } else if (hasVariance) {
                                return (
                                    <button
                                        onClick={() => {
                                            const adjustment = jobDetails.poAmount! - totalCost;
                                            const newExtra = {
                                                id: Date.now(),
                                                description: 'PO Adjustment',
                                                cost: adjustment
                                            };
                                            quote.setExtras([...extras, newExtra]);
                                        }}
                                        className="px-3 py-2 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 whitespace-nowrap font-medium"
                                        title="Add adjustment to match PO amount"
                                    >
                                        Charge at PO
                                    </button>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Enter the customer's PO value</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Variance Reason
                </label>
                <input
                    type="text"
                    value={jobDetails.varianceReason || ''}
                    onChange={(e) => quote.setJobDetails({ ...jobDetails, varianceReason: e.target.value })}
                    className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Extra site time requested..."
                />
            </div>

            {/* Variance Display */}
            <div className="bg-gray-700 p-4 rounded border border-gray-600 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-300">Final Invoice Total:</span>
                    <span className="text-lg font-bold text-slate-100">{formatMoney(totalCost)}</span>
                </div>

                {jobDetails.poAmount && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                        <span className="text-xs text-slate-400">vs PO Amount:</span>
                        <span className={`text-sm font-bold ${totalCost > jobDetails.poAmount ? 'text-red-400' :
                            totalCost < jobDetails.poAmount ? 'text-emerald-400' :
                                'text-slate-400'
                            }`}>
                            {formatMoney(totalCost - jobDetails.poAmount)}
                            {Math.abs(totalCost - jobDetails.poAmount) > 0.01 ? (
                                totalCost > jobDetails.poAmount ? ' (Over PO)' : ' (Under PO)'
                            ) : ' (Matches PO)'}
                        </span>
                    </div>
                )}

                {jobDetails.originalQuoteAmount && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                        <span className="text-xs text-slate-400">vs Original Quote:</span>
                        <span className={`text-sm font-bold ${totalCost > jobDetails.originalQuoteAmount ? 'text-amber-400' :
                            totalCost < jobDetails.originalQuoteAmount ? 'text-cyan-400' :
                                'text-slate-400'
                            }`}>
                            {formatMoney(totalCost - jobDetails.originalQuoteAmount)}
                            {Math.abs(totalCost - jobDetails.originalQuoteAmount) > 0.01 ? (
                                totalCost > jobDetails.originalQuoteAmount ? ' (Higher)' : ' (Lower)'
                            ) : ' (No Change)'}
                        </span>
                    </div>
                )}

                {jobDetails.poAmount && jobDetails.originalQuoteAmount && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                        <span className="text-xs text-slate-400">PO vs Original Quote:</span>
                        <span className={`text-sm font-bold ${jobDetails.poAmount > jobDetails.originalQuoteAmount ? 'text-emerald-400' :
                            jobDetails.poAmount < jobDetails.originalQuoteAmount ? 'text-red-400' :
                                'text-slate-400'
                            }`}>
                            {formatMoney(jobDetails.poAmount - jobDetails.originalQuoteAmount)}
                            {Math.abs(jobDetails.poAmount - jobDetails.originalQuoteAmount) > 0.01 ? (
                                jobDetails.poAmount > jobDetails.originalQuoteAmount ? ' (PO Higher)' : ' (PO Lower)'
                            ) : ' (Match)'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
