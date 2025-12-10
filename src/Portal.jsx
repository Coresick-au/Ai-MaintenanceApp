import React, { useState } from 'react';
import { MaintenanceWrapper } from './apps/MaintenanceWrapper';
import { InventoryApp } from './apps/InventoryApp';
import { QuotingWrapper } from './apps/quoting/QuotingWrapper';
import { CustomerApp } from './apps/CustomerPortal/CustomerApp';
import { EmployeeApp } from './apps/employees/EmployeeApp';

const Portal = () => {
    const [activeApp, setActiveApp] = useState(null); // null = Portal Home

    // Define your apps here
    const APPS = [
        {
            id: 'customer_portal',
            name: 'Customer Portal',
            fullName: 'Master Data Management',
            description: 'Manage customers, contacts, and global site lists.',
            icon: '🗂️',
            color: 'purple',
            component: <CustomerApp onBack={() => setActiveApp(null)} />
        },
        {
            id: 'aimm',
            name: 'AIMM',
            fullName: 'Accurate Industries Maintenance Manager',
            description: 'Asset tracking, calibration schedules, and service reporting.',
            icon: '🛠️',
            color: 'cyan',
            component: <MaintenanceWrapper onBack={() => setActiveApp(null)} />
        },
        {
            id: 'employees',
            name: 'Team Management',
            fullName: 'Employee & Training Manager',
            description: 'Manage employees, certifications, site access, and compliance tracking.',
            icon: '👥',
            color: 'blue',
            component: <EmployeeApp onBack={() => setActiveApp(null)} />
        },
        {
            id: 'inventory',
            name: 'Inventory Control',
            fullName: 'Stock & Warehouse Management',
            description: 'Stock levels, ordering, and warehouse management.',
            icon: '📦',
            color: 'emerald',
            component: <InventoryApp onBack={() => setActiveApp(null)} />
        },
        {
            id: 'quoter',
            name: 'Service Quoter',
            fullName: 'Quote Generation System',
            description: 'Generate service quotes, track labor hours, and manage rates.',
            icon: '💰',
            color: 'emerald',
            component: <QuotingWrapper onBack={() => setActiveApp(null)} />
        }
    ];

    // If an app is active, render it
    if (activeApp) {
        const app = APPS.find(a => a.id === activeApp);
        return app ? app.component : <div>App Not Found</div>;
    }

    // Otherwise, render the Portal Dashboard
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-center relative overflow-hidden selection:bg-cyan-500/30">

            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-cyan-600 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-700 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-5xl w-full px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl mb-6">
                        {/* Company Logo - Doubled Size */}
                        <img
                            src="./logos/ai-logo.png"
                            alt="Accurate Industries"
                            className="h-64 w-auto object-contain"
                        />
                    </div>
                    <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 mb-4">
                        Accurate Industries
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Select an application to launch. All tools are integrated into a single secure workspace.
                    </p>
                </div>

                {/* App Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {APPS.map((app) => (
                        <button
                            key={app.id}
                            onClick={() => !app.disabled && setActiveApp(app.id)}
                            disabled={app.disabled}
                            className={`
                group relative flex flex-col items-start text-left p-8 
                bg-slate-900/50 backdrop-blur-md border border-slate-800 
                rounded-2xl transition-all duration-300
                ${app.disabled
                                    ? 'opacity-50 cursor-not-allowed grayscale'
                                    : 'hover:border-' + app.color + '-500/50 hover:bg-slate-800/80 hover:-translate-y-2 hover:shadow-2xl hover:shadow-' + app.color + '-900/20'
                                }
              `}
                        >
                            {/* Hover Glow Effect */}
                            {!app.disabled && (
                                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-${app.color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                            )}

                            <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-6 
                bg-slate-800 border border-slate-700 shadow-inner
                transition-all
                ${!app.disabled && 'group-hover:scale-110 group-hover:border-' + app.color + '-500/50'}
              `}>
                                {app.icon}
                            </div>

                            <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-white">
                                {app.name}
                            </h3>
                            <p className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-wider">
                                {app.fullName}
                            </p>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                {app.description}
                            </p>

                            {!app.disabled && (
                                <div className={`mt-auto pt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-${app.color}-500 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0`}>
                                    Launch App <span>→</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="mt-16 text-center text-xs text-slate-600 font-mono">
                    ACCURATE_INDUSTRIES_SUITE_V1.0 // ENVIRONMENT: PRODUCTION
                </div>
            </div>
        </div>
    );
};

export default Portal;
