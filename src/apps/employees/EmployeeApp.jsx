import React from 'react';
import { EmployeeManager } from '../../components/EmployeeManager';
import { GlobalDataProvider, useGlobalData } from '../../context/GlobalDataContext';

/**
 * Inner component that uses the context
 */
const EmployeeAppInner = ({ onBack }) => {
    const { employees, sites, addEmployee, updateEmployee } = useGlobalData();

    return (
        <div className="relative min-h-screen bg-slate-950">
            {/* Exit Button - Top Right */}
            <div className="fixed top-4 right-4 z-[60] print:hidden">
                <button
                    onClick={onBack}
                    className="bg-slate-900/80 backdrop-blur text-white px-3 py-1.5 rounded-lg shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-bold text-xs border border-slate-700"
                >
                    <span>✕</span> Exit
                </button>
            </div>

            {/* Employee Manager Component */}
            <EmployeeManager
                isOpen={true}
                onClose={onBack}
                employees={employees}
                sites={sites}
                onAddEmployee={addEmployee}
                onUpdateEmployee={updateEmployee}
            />

            {/* Floating Home Button - Bottom Right */}
            <button
                onClick={onBack}
                className="fixed bottom-4 right-4 z-[9999] p-3 bg-slate-800 border border-slate-600 rounded-full shadow-2xl text-cyan-400 hover:bg-slate-700 hover:text-white transition-all hover:scale-110 print:hidden"
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

/**
 * Standalone Employee Management Application
 * Wraps the app with GlobalDataProvider for context access
 */
export const EmployeeApp = ({ onBack }) => {
    return (
        <GlobalDataProvider>
            <EmployeeAppInner onBack={onBack} />
        </GlobalDataProvider>
    );
};
