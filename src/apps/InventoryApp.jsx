import React from 'react';

export const InventoryApp = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                    <h1 className="text-3xl font-bold text-emerald-400">Inventory Control</h1>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                        Exit to Portal
                    </button>
                </div>

                <p className="text-slate-400 mb-6">
                    This is a placeholder for your second business application.
                    Notice it maintains the same styling DNA as AIMM.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed flex flex-col items-center justify-center h-32 text-slate-500">
                        <span className="text-3xl mb-2">📦</span>
                        <span className="text-sm">Stock Levels</span>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 border-dashed flex flex-col items-center justify-center h-32 text-slate-500">
                        <span className="text-3xl mb-2">🚚</span>
                        <span className="text-sm">Incoming Orders</span>
                    </div>
                </div>
            </div>

            {/* Floating Home Button - Bottom Right */}
            <button
                onClick={onBack}
                className="fixed bottom-4 right-4 z-[9999] p-3 bg-slate-800 border border-slate-600 rounded-full shadow-2xl text-cyan-400 hover:bg-slate-700 hover:text-white transition-all hover:scale-110"
                title="Return to App Portal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
            </button>
        </div>
    );
};
