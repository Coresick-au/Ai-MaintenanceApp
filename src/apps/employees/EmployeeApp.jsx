import React from 'react';
import { EmployeeManager } from '../../components/EmployeeManager';
import { GlobalDataProvider, useGlobalData } from '../../context/GlobalDataContext';
import BackButton from '../../components/ui/BackButton';

/**
 * Inner component that uses the context
 */
const EmployeeAppInner = ({ onBack }) => {
    const { employees, sites, customers, addEmployee, updateEmployee } = useGlobalData();

    return (
        <div className="relative min-h-screen bg-slate-950">
            {/* Unified Back Button - Top Left */}
            <div className="fixed top-4 left-4 z-[60] print:hidden">
                <BackButton label="Back to Portal" onClick={onBack} />
            </div>

            {/* Employee Manager Component */}
            <EmployeeManager
                isOpen={true}
                onClose={onBack}
                employees={employees}
                sites={sites}
                customers={customers}
                onAddEmployee={addEmployee}
                onUpdateEmployee={updateEmployee}
            />
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
