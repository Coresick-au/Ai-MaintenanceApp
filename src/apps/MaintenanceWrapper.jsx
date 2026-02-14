import React from 'react';
import { App } from '../App.jsx';
import { SiteProvider } from '../context/SiteContext';
import { UIProvider } from '../context/UIContext';
import { FilterProvider } from '../context/FilterContext';
import { UndoProvider } from '../context/UndoContext';
import { ErrorBoundary } from '../components/UIComponents';
import BackButton from '../components/ui/BackButton';

export const MaintenanceWrapper = ({ onBack, onNavigateTo }) => {
    return (
        <ErrorBoundary>
            <UndoProvider>
                <SiteProvider>
                    <UIProvider onNavigateTo={onNavigateTo}>
                        <FilterProvider>
                            <div className="relative">
                                {/* Unified Back Button - Top Left */}
                                <div className="fixed top-4 left-4 z-[9999] print:hidden">
                                    <BackButton label="Back to Portal" onClick={onBack} />
                                </div>
                                <App />
                            </div>
                        </FilterProvider>
                    </UIProvider>
                </SiteProvider>
            </UndoProvider>
        </ErrorBoundary>
    );
};
