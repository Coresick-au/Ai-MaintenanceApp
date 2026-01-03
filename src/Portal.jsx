import React, { useState } from 'react';
import { useAuth } from './context/AuthContext'; // Import Auth
import Login from './components/Login';         // Import Login
import UserManagement from './components/admin/UserManagement'; // Import Admin

import { MaintenanceWrapper } from './apps/MaintenanceWrapper';
import { InventoryApp } from './apps/InventoryApp';
import { QuotingWrapper } from './apps/quoting/QuotingWrapper';
import { CustomerApp } from './apps/CustomerPortal/CustomerApp';
import { EmployeeApp } from './apps/employees/EmployeeApp';
import { TimesheetApp } from './apps/TimesheetApp/TimesheetApp';
import { AdminDashboard } from './apps/TimesheetApp/AdminDashboard';
import JobSheetPage from './pages/JobSheetPage';

const Portal = () => {
    const { currentUser, userRole, userData, logout } = useAuth();
    const [activeApp, setActiveApp] = useState(null);

    // 1. GUARD: If not logged in, show Login
    if (!currentUser) return <Login />;

    // 2. APP DEFINITIONS
    const APPS = [
        {
            id: 'customer_portal',
            name: 'Customer Portal',
            fullName: 'Master Data Management',
            description: 'Manage customers, contacts, and global site lists.',
            icon: '🗂️',
            color: 'purple',
            component: <CustomerApp onBack={() => setActiveApp(null)} />,
            // PERMISSION: Admin, Manager, or Tech
            restricted: !['admin', 'manager', 'tech'].includes(userRole)
        },
        {
            id: 'aimm',
            name: 'AIMM',
            fullName: 'Accurate Industries Maintenance Manager',
            description: 'Asset tracking, calibration schedules, and service reporting.',
            icon: '🛠️',
            color: 'cyan',
            component: <MaintenanceWrapper onBack={() => setActiveApp(null)} />,
            // PERMISSION: Everyone can access
            restricted: false
        },
        {
            id: 'employees',
            name: 'Team Management',
            fullName: 'Employee & Training Manager',
            description: 'Manage employees, certifications, site access, and compliance tracking.',
            icon: '👥',
            color: 'blue',
            component: <EmployeeApp onBack={() => setActiveApp(null)} />,
            // PERMISSION: Admin or Manager only
            restricted: !['admin', 'manager'].includes(userRole)
        },
        {
            id: 'inventory',
            name: 'Inventory Control',
            fullName: 'Stock & Warehouse Management',
            description: 'Stock levels, ordering, and warehouse management.',
            icon: '📦',
            color: 'emerald',
            component: <InventoryApp onBack={() => setActiveApp(null)} />,
            // PERMISSION: Admin or Manager only
            restricted: !['admin', 'manager'].includes(userRole)
        },
        {
            id: 'quoter',
            name: 'Service Quoter',
            fullName: 'Quote Generation System',
            description: 'Generate service quotes, track labor hours, and manage rates.',
            icon: '💰',
            color: 'emerald',
            component: <QuotingWrapper onBack={() => setActiveApp(null)} />,
            // PERMISSION: Admin or Manager only
            restricted: !['admin', 'manager'].includes(userRole)
        },
        {
            id: 'jobsheet',
            name: 'Job Sheet',
            fullName: 'Job Tracking System',
            description: 'Track jobs, POs, invoices, and parts orders in a spreadsheet-style view.',
            icon: '📋',
            color: 'sky',
            component: <JobSheetPage onBack={() => setActiveApp(null)} currentUser={currentUser} userRole={userRole} />,
            // PERMISSION: Admin, Manager, or Tech
            restricted: !['admin', 'manager', 'tech'].includes(userRole)
        },
        {
            id: 'timesheets',
            name: 'My Timesheets',
            fullName: 'Personal Hourly Tracking',
            description: 'Log your daily hours, track task history, and submit sheets.',
            icon: '🕒',
            color: 'amber',
            component: <TimesheetApp onBack={() => setActiveApp(null)} />,
            // PERMISSION: User must have the feature enabled in their profile
            restricted: !userData?.features?.timesheetsEnabled
        },
        {
            id: 'timesheet_admin',
            name: 'Timesheet Admin',
            fullName: 'All Staff Timesheet Overview',
            description: 'View and manage timesheets for all staff members with analytics and export.',
            icon: '📊',
            color: 'indigo',
            component: <AdminDashboard onBack={() => setActiveApp(null)} />,
            // PERMISSION: Admin or Manager only
            restricted: !['admin', 'manager'].includes(userRole)
        }
    ];

    // Handle Active App View
    if (activeApp === 'admin_users') {
        return <UserManagement onBack={() => setActiveApp(null)} />;
    }

    if (activeApp) {
        const app = APPS.find(a => a.id === activeApp);
        return app ? app.component : <div>App Not Found</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">

            {/* Header / Logout Bar */}
            <div className="absolute top-0 right-0 p-6 z-50 flex gap-4 items-center">
                <div className="text-right">
                    <div className="text-sm font-bold text-white">{currentUser.email}</div>
                    <div className="text-xs text-cyan-400 uppercase tracking-wider">{userRole} Access</div>
                </div>

                <button
                    onClick={logout}
                    className="bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 px-4 py-2 rounded-lg border border-slate-700 transition-colors text-sm font-bold"
                >
                    Logout
                </button>
            </div>

            {/* Admin Button (Only visible to Admins) */}
            {userRole === 'admin' && (
                <div className="absolute top-0 left-0 p-6 z-50">
                    <button
                        onClick={() => setActiveApp('admin_users')}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 px-4 py-2 rounded-lg border border-slate-700 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        <span>🛡️</span> Manage Users
                    </button>
                </div>
            )}

            <div className="relative z-10 max-w-5xl w-full px-6 mt-12">
                <div className="text-center mb-16">
                    <img src="./logos/ai-logo.png" alt="Logo" className="h-48 w-auto object-contain mx-auto mb-6" />
                    <h1 className="text-5xl font-black text-white mb-4">Accurate Industries</h1>
                    <p className="text-lg text-slate-400">Select an application to launch.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {APPS.filter(app => !app.restricted).map((app) => (
                        <button
                            key={app.id}
                            onClick={() => !app.restricted && setActiveApp(app.id)}
                            disabled={app.restricted}
                            className={`
                                group relative flex flex-col items-start text-left p-8 
                                rounded-2xl transition-all duration-300 border
                                ${app.restricted
                                    ? 'bg-slate-900/20 border-slate-800 opacity-40 cursor-not-allowed grayscale'
                                    : 'bg-slate-900/50 backdrop-blur-md border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 hover:-translate-y-2 hover:shadow-2xl'
                                }
                            `}
                        >
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-6 bg-slate-800 border border-slate-700">
                                {app.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-200 mb-2">{app.name}</h3>
                            <p className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-wider">{app.fullName}</p>
                            <p className="text-sm text-slate-400 mb-4">{app.description}</p>

                            {app.restricted && (
                                <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500">
                                    <span>🔒</span> Access Restricted
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Portal;
