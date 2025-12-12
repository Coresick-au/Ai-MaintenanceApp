import React from 'react';
import { App } from '../App.jsx';
import { SiteProvider } from '../context/SiteContext';
import { UIProvider } from '../context/UIContext';
import { FilterProvider } from '../context/FilterContext';
import { UndoProvider } from '../context/UndoContext';
import { ErrorBoundary } from '../components/UIComponents';

export const MaintenanceWrapper = ({ onBack }) => {
    return (
        <ErrorBoundary>
            <UndoProvider>
                <SiteProvider>
                    <UIProvider>
                        <FilterProvider>
                            <div className="relative">
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
                                <App />
                            </div>
                        </FilterProvider>
                    </UIProvider>
                </SiteProvider>
            </UndoProvider>
        </ErrorBoundary>
    );
};
