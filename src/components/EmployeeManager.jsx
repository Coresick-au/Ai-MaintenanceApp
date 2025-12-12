import React, { useState, useMemo } from 'react';
import * as ReactDOM from 'react-dom';
import { Modal, Button } from './UIComponents';
import { Icons } from '../constants/icons';
import { formatDate } from '../utils/helpers';
import { getExpiryStatus, getStatusColorClasses } from '../utils/employeeUtils';
import { INDUCTION_CATEGORIES, getCategoryColors, getInductionLabel, getCategoryIcon } from '../constants/inductionCategories';

// Define the Roles based on professional standards
const ROLES = [
    'Service Technician',
    'Office Manager',
    'General Manager',
    'Service Manager',
    'Projects Manager'
];

// --- NEW COMPONENT: Compliance Overview Dashboard ---
const ComplianceDashboard = ({ employees, onSelectEmp }) => {
    const expiringItems = useMemo(() => {
        const items = [];
        employees.forEach(emp => {
            // Check Certifications
            (emp.certifications || []).forEach(c => {
                const s = getExpiryStatus(c.expiry);
                if (s !== 'valid') items.push({ ...c, type: 'Certification', empName: emp.name, status: s, emp });
            });
            // Check Inductions
            (emp.inductions || []).forEach(i => {
                const s = getExpiryStatus(i.expiry);
                if (s !== 'valid') items.push({ ...i, type: 'Induction', empName: emp.name, status: s, emp });
            });
        });
        // Sort by expiry date (soonest first)
        return items.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    }, [employees]);

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Icons.Activity className="text-cyan-400" />
                    Compliance Dashboard
                </h3>
                <p className="text-slate-400 text-sm">
                    Overview of all expiring certifications and site inductions across the team.
                </p>
            </div>

            <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-700 bg-slate-900/30 flex justify-between items-center">
                    <span className="font-bold text-slate-200">Attention Required ({expiringItems.length})</span>
                </div>

                <div className="overflow-y-auto flex-1">
                    {expiringItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
                            <Icons.CheckCircle size={48} className="mb-4 text-green-500/20" />
                            <p>All technicians are fully compliant!</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">Technician</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Item</th>
                                    <th className="px-4 py-2">Expiry</th>
                                    <th className="px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {expiringItems.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-slate-700/50 cursor-pointer transition-colors"
                                        onClick={() => onSelectEmp(item.emp)}
                                    >
                                        <td className="px-4 py-2 font-medium text-slate-200">{item.empName}</td>
                                        <td className="px-4 py-2 text-slate-400">{item.type}</td>
                                        <td className="px-4 py-2 text-slate-300">{item.name}</td>
                                        <td className="px-4 py-2 text-slate-400 font-mono text-xs">{formatDate(item.expiry)}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${item.status === 'expired'
                                                ? 'text-red-400 bg-red-900/20 border-red-900/50'
                                                : 'text-amber-400 bg-amber-900/20 border-amber-900/50'
                                                }`}>
                                                {item.status === 'expired' ? 'Expired' : item.status === 'warning' ? 'Due Soon' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export const EmployeeManager = ({ isOpen, onClose, employees, sites, onAddEmployee, onUpdateEmployee }) => {
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [newEmpForm, setNewEmpForm] = useState({
        name: '',
        role: 'Service Technician',
        email: '',
        phone: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        status: 'active'
    });
    const [newCertForm, setNewCertForm] = useState({ name: '', provider: '', expiry: '', pdfUrl: '' });
    const [newInductionForm, setNewInductionForm] = useState({ siteId: '', category: 'site', customCategory: '', expiry: '', notes: '' });

    // NEW: Edit states
    const [editingCertId, setEditingCertId] = useState(null);
    const [editCertForm, setEditCertForm] = useState({ name: '', provider: '', expiry: '', pdfUrl: '' });
    const [editingInductionId, setEditingInductionId] = useState(null);
    const [editInductionForm, setEditInductionForm] = useState({ siteId: '', category: 'site', customCategory: '', expiry: '', notes: '' });

    // Filter for active sites only - MUST BE BEFORE EARLY RETURN
    const activeSites = useMemo(() => {
        const allSites = sites || [];
        // Try to filter for active sites
        const filtered = allSites.filter(site => site.active !== false);
        // If we have active sites, show them. usage of length > 0 ensures we don't show empty list if we have candidates.
        // If filtered is empty but allSites is not (meaning all sites are archived?), show allSites to be safe.
        // If allSites is empty, well, we return [] anyway.
        return filtered.length > 0 ? filtered : allSites;
    }, [sites]);

    if (!isOpen) return null;

    // Helper to get status color
    const getStatusColor = (status) => {
        if (status === 'expired') return 'text-red-400 bg-red-900/20 border-red-900';
        if (status === 'warning') return 'text-amber-400 bg-amber-900/20 border-amber-900';
        return 'text-green-400 bg-green-900/20 border-green-900';
    };

    const content = (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-7xl h-[90vh] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Icons.Users /> Technician & Training Tracker
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 gap-6 p-6 overflow-hidden">

                    {/* LEFT: EMPLOYEE LIST & LEGEND */}
                    <div className="w-1/3 border-r border-slate-700 pr-4 flex flex-col">
                        <div className="mb-4 space-y-2">
                            <button
                                onClick={() => setSelectedEmp(null)}
                                className={`w-full px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-left ${selectedEmp === null
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                            >
                                <Icons.Activity size={16} /> Compliance Overview
                            </button>
                            <button
                                onClick={() => setSelectedEmp('new')}
                                className={`w-full px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-left ${selectedEmp === 'new'
                                    ? 'bg-cyan-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                            >
                                <Icons.Plus size={16} /> Add Technician
                            </button>
                        </div>

                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Technicians</div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {employees.filter(emp => emp.status !== 'archived').map(emp => {
                                const hasCertIssues = emp.certifications?.some(cert => ['expired', 'warning'].includes(getExpiryStatus(cert.expiry)));
                                const hasInductionIssues = emp.inductions?.some(ind => ['expired', 'warning'].includes(getExpiryStatus(ind.expiry)));
                                const hasIssues = hasCertIssues || hasInductionIssues;

                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => setSelectedEmp(emp)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedEmp?.id === emp.id
                                            ? 'bg-cyan-900/30 border-cyan-500'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-slate-200">{emp.name}</div>
                                            {hasIssues && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                                        </div>
                                        <div className="text-xs text-slate-400">{emp.role}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Option to show Archived employees */}
                        <details className="mt-2 text-sm">
                            <summary className="text-slate-400 cursor-pointer hover:text-slate-200 px-1">
                                View Archived Technicians ({employees.filter(emp => emp.status === 'archived').length})
                            </summary>
                            <div className="space-y-2 mt-2">
                                {employees.filter(emp => emp.status === 'archived').map(emp => (
                                    <div
                                        key={emp.id}
                                        onClick={() => setSelectedEmp(emp)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedEmp?.id === emp.id
                                            ? 'bg-purple-900/30 border-purple-500'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 opacity-70'
                                            }`}
                                    >
                                        <div className="font-bold text-slate-400">{emp.name} (ARCHIVED)</div>
                                        <div className="text-xs text-slate-500">{emp.role}</div>
                                    </div>
                                ))}
                            </div>
                        </details>

                        {/* --- INFO PANEL / LEGEND --- */}
                        <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg">
                            <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2">
                                <Icons.Info size={12} /> Status Guide
                            </h4>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span>Valid (60+ Days)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <span>Due Soon (&lt; 60 Days)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span>Expired</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: DETAILS PANEL */}
                    <div className="w-2/3 pl-2 overflow-y-auto">
                        {selectedEmp === 'new' ? (
                            /* NEW EMPLOYEE FORM */
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                <h3 className="text-lg font-bold text-white mb-4">Onboard New Team Member</h3>
                                <div className="space-y-4">
                                    <input
                                        placeholder="Full Name (Mandatory)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        value={newEmpForm.name}
                                        onChange={e => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Role/Title (e.g., Service Technician, Office Manager, etc.)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        value={newEmpForm.role}
                                        onChange={e => setNewEmpForm({ ...newEmpForm, role: e.target.value })}
                                        list="role-suggestions"
                                    />
                                    <datalist id="role-suggestions">
                                        {ROLES.map(role => (
                                            <option key={role} value={role} />
                                        ))}
                                    </datalist>

                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="Primary Phone"
                                            className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            value={newEmpForm.phone}
                                            onChange={e => setNewEmpForm({ ...newEmpForm, phone: e.target.value })}
                                        />
                                        <input
                                            placeholder="Primary Email (Mandatory, Unique)"
                                            className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            value={newEmpForm.email}
                                            onChange={e => setNewEmpForm({ ...newEmpForm, email: e.target.value })}
                                        />
                                    </div>

                                    {/* NEW: Address Field */}
                                    <input
                                        placeholder="Residential Address"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        value={newEmpForm.address}
                                        onChange={e => setNewEmpForm({ ...newEmpForm, address: e.target.value })}
                                    />

                                    {/* NEW: Emergency Contact Fields */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                                        <input
                                            placeholder="Emergency Contact Name"
                                            className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            value={newEmpForm.emergencyContactName}
                                            onChange={e => setNewEmpForm({ ...newEmpForm, emergencyContactName: e.target.value })}
                                        />
                                        <input
                                            placeholder="Emergency Contact Phone"
                                            className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            value={newEmpForm.emergencyContactPhone}
                                            onChange={e => setNewEmpForm({ ...newEmpForm, emergencyContactPhone: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (!newEmpForm.name || !newEmpForm.email) return window.alert("Name and Email are mandatory fields.");

                                            onAddEmployee(newEmpForm);
                                            setSelectedEmp(null);
                                            setNewEmpForm({
                                                name: '',
                                                role: 'Service Technician',
                                                email: '',
                                                phone: '',
                                                address: '',
                                                emergencyContactName: '',
                                                emergencyContactPhone: '',
                                                status: 'active'
                                            });
                                        }}
                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Save New Employee
                                    </button>
                                </div>
                            </div>
                        ) : selectedEmp ? (
                            /* EXISTING EMPLOYEE DETAILS */
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{selectedEmp.name}</h2>
                                        <div className="flex gap-4 text-sm text-slate-400 mt-1">
                                            <span>{selectedEmp.role}</span>
                                            {selectedEmp.phone && <span>• {selectedEmp.phone}</span>}
                                            {selectedEmp.email && <span>• {selectedEmp.email}</span>}
                                            {selectedEmp.status === 'archived' && <span className="text-red-500 font-bold">• ARCHIVED</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const newStatus = selectedEmp.status === 'active' ? 'archived' : 'active';
                                                onUpdateEmployee(selectedEmp.id, { status: newStatus });
                                                setSelectedEmp({ ...selectedEmp, status: newStatus });
                                            }}
                                            className={`px-4 py-2 text-sm rounded-lg transition-colors ${selectedEmp.status === 'active'
                                                ? 'bg-red-700 hover:bg-red-600 text-white'
                                                : 'bg-green-700 hover:bg-green-600 text-white'}`}
                                        >
                                            {selectedEmp.status === 'active' ? 'Archive Employee' : 'Restore Employee'}
                                        </button>
                                        <button
                                            onClick={() => setSelectedEmp(null)}
                                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>

                                {/* NEW: Personnel Details Card */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                                    <h3 className="font-bold text-slate-200 mb-3">Personnel Details</h3>
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                        <div className="text-slate-500">Address:</div>
                                        <div className="text-slate-300">{selectedEmp.address || 'N/A'}</div>

                                        <div className="text-slate-500">Emergency Contact Name:</div>
                                        <div className="text-slate-300">{selectedEmp.emergencyContactName || 'N/A'}</div>

                                        <div className="text-slate-500">Emergency Contact Phone:</div>
                                        <div className="text-slate-300">{selectedEmp.emergencyContactPhone || 'N/A'}</div>

                                        <div className="text-slate-500">Status:</div>
                                        <div className={`font-bold uppercase text-xs ${selectedEmp.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                            {selectedEmp.status || 'active'}
                                        </div>
                                    </div>
                                </div>

                                {/* CERTIFICATIONS TABLE */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-200">Certifications & Training</h3>
                                    </div>

                                    {/* Add Cert Form (Inline) */}
                                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 grid grid-cols-6 gap-2">
                                        <input
                                            placeholder="Name (e.g. First Aid)"
                                            className="col-span-2 bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={newCertForm.name}
                                            onChange={e => setNewCertForm({ ...newCertForm, name: e.target.value })}
                                        />
                                        <input
                                            placeholder="Provider"
                                            className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={newCertForm.provider}
                                            onChange={e => setNewCertForm({ ...newCertForm, provider: e.target.value })}
                                        />
                                        <input
                                            type="date"
                                            className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={newCertForm.expiry}
                                            onChange={e => setNewCertForm({ ...newCertForm, expiry: e.target.value })}
                                            title="Expiry Date"
                                        />
                                        <input
                                            placeholder="PDF Link (OneDrive)"
                                            className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={newCertForm.pdfUrl}
                                            onChange={e => setNewCertForm({ ...newCertForm, pdfUrl: e.target.value })}
                                            title="OneDrive PDF Link"
                                        />
                                        <button
                                            onClick={() => {
                                                if (!newCertForm.name) return;
                                                const updatedCerts = [...(selectedEmp.certifications || []), {
                                                    ...newCertForm,
                                                    id: `cert-${Date.now()}`,
                                                    date: new Date().toISOString().split('T')[0]
                                                }];
                                                onUpdateEmployee(selectedEmp.id, { certifications: updatedCerts });
                                                setNewCertForm({ name: '', provider: '', expiry: '', pdfUrl: '' });
                                                setSelectedEmp({ ...selectedEmp, certifications: updatedCerts });
                                            }}
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
                                        >
                                            + Add
                                        </button>
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900">
                                            <tr>
                                                <th className="px-4 py-2">Certification</th>
                                                <th className="px-4 py-2">Provider</th>
                                                <th className="px-4 py-2">Expiry</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2 w-12">PDF</th>
                                                <th className="px-4 py-2 w-20">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {(selectedEmp.certifications || []).map(cert => {
                                                const status = getExpiryStatus(cert.expiry);
                                                const isEditing = editingCertId === cert.id;

                                                return (
                                                    <tr key={cert.id} className="hover:bg-slate-700/50">
                                                        {isEditing ? (
                                                            <>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editCertForm.name}
                                                                        onChange={e => setEditCertForm({ ...editCertForm, name: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editCertForm.provider}
                                                                        onChange={e => setEditCertForm({ ...editCertForm, provider: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="date"
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editCertForm.expiry}
                                                                        onChange={e => setEditCertForm({ ...editCertForm, expiry: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2"></td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        placeholder="PDF URL"
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editCertForm.pdfUrl}
                                                                        onChange={e => setEditCertForm({ ...editCertForm, pdfUrl: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                const updatedCerts = selectedEmp.certifications.map(c =>
                                                                                    c.id === cert.id ? { ...c, ...editCertForm } : c
                                                                                );
                                                                                onUpdateEmployee(selectedEmp.id, { certifications: updatedCerts });
                                                                                setSelectedEmp({ ...selectedEmp, certifications: updatedCerts });
                                                                                setEditingCertId(null);
                                                                            }}
                                                                            className="text-green-400 hover:text-green-300"
                                                                            title="Save"
                                                                        >
                                                                            <Icons.Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingCertId(null)}
                                                                            className="text-slate-400 hover:text-slate-300"
                                                                            title="Cancel"
                                                                        >
                                                                            <Icons.X size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-2 font-medium text-slate-200">{cert.name}</td>
                                                                <td className="px-4 py-2 text-slate-400">{cert.provider || '-'}</td>
                                                                <td className="px-4 py-2 text-slate-300">{cert.expiry ? formatDate(cert.expiry) : '-'}</td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(status)} uppercase`}>
                                                                        {status === 'expired' ? 'Expired' : status === 'warning' ? 'Due Soon' : 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2 text-center">
                                                                    {cert.pdfUrl ? (
                                                                        <a
                                                                            href={cert.pdfUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-blue-400 hover:text-blue-300 transition-colors inline-block"
                                                                            title="View Certificate PDF"
                                                                        >
                                                                            <Icons.ExternalLink size={14} />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-slate-600">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingCertId(cert.id);
                                                                                setEditCertForm({
                                                                                    name: cert.name,
                                                                                    provider: cert.provider || '',
                                                                                    expiry: cert.expiry || '',
                                                                                    pdfUrl: cert.pdfUrl || ''
                                                                                });
                                                                            }}
                                                                            className="text-blue-400 hover:text-blue-300"
                                                                            title="Edit"
                                                                        >
                                                                            <Icons.Edit size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!window.confirm(`Are you sure you want to delete the certification "${cert.name}"?`)) return;
                                                                                const updatedCerts = selectedEmp.certifications.filter(c => c.id !== cert.id);
                                                                                onUpdateEmployee(selectedEmp.id, { certifications: updatedCerts });
                                                                                setSelectedEmp({ ...selectedEmp, certifications: updatedCerts });
                                                                            }}
                                                                            className="text-red-400 hover:text-red-300"
                                                                            title="Delete"
                                                                        >
                                                                            <Icons.Trash size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {(!selectedEmp.certifications || selectedEmp.certifications.length === 0) && (
                                                <tr><td colSpan="5" className="p-4 text-center text-slate-500 italic">No certifications yet. Add one above.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* SITE INDUCTIONS TABLE */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-200">Site Inductions</h3>
                                    </div>

                                    {/* Add Induction Form (Inline) */}
                                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 space-y-2">
                                        <div className="grid grid-cols-6 gap-2">
                                            <select
                                                className="col-span-2 bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                                value={newInductionForm.category}
                                                onChange={e => setNewInductionForm({ ...newInductionForm, category: e.target.value })}
                                            >
                                                {Object.entries(INDUCTION_CATEGORIES).map(([key, cat]) => (
                                                    <option key={key} value={key}>
                                                        {cat.icon} {cat.label}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                className="col-span-2 bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                                value={newInductionForm.siteId}
                                                onChange={e => setNewInductionForm({ ...newInductionForm, siteId: e.target.value })}
                                            >
                                                <option value="">Select Site...</option>
                                                {activeSites.map(site => (
                                                    <option key={site.id} value={site.id}>
                                                        {site.customer} - {site.location}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="date"
                                                className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                                value={newInductionForm.expiry}
                                                onChange={e => setNewInductionForm({ ...newInductionForm, expiry: e.target.value })}
                                                title="Expiry Date"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (!newInductionForm.siteId) return;

                                                    const selectedSite = activeSites.find(s => s.id === newInductionForm.siteId);
                                                    const siteName = selectedSite ? `${selectedSite.customer} - ${selectedSite.location}` : 'Unknown Site';

                                                    const updatedInductions = [...(selectedEmp.inductions || []), {
                                                        id: `ind-${Date.now()}`,
                                                        siteId: newInductionForm.siteId,
                                                        name: siteName,
                                                        category: newInductionForm.category,
                                                        customCategory: newInductionForm.customCategory,
                                                        expiry: newInductionForm.expiry,
                                                        notes: newInductionForm.notes,
                                                        date: new Date().toISOString().split('T')[0]
                                                    }];

                                                    onUpdateEmployee(selectedEmp.id, { inductions: updatedInductions });
                                                    setNewInductionForm({ siteId: '', category: 'site', customCategory: '', expiry: '', notes: '' });
                                                    setSelectedEmp({ ...selectedEmp, inductions: updatedInductions });
                                                }}
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        {newInductionForm.category === 'custom' && (
                                            <input
                                                placeholder="Custom Category Name (e.g., 'Confined Space', 'Working at Heights')"
                                                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                                value={newInductionForm.customCategory}
                                                onChange={e => setNewInductionForm({ ...newInductionForm, customCategory: e.target.value })}
                                            />
                                        )}
                                        <input
                                            placeholder="Notes (optional)"
                                            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                            value={newInductionForm.notes}
                                            onChange={e => setNewInductionForm({ ...newInductionForm, notes: e.target.value })}
                                        />
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900">
                                            <tr>
                                                <th className="px-4 py-2">Category</th>
                                                <th className="px-4 py-2">Site / Induction</th>
                                                <th className="px-4 py-2">Expiry</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2 w-20">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {(selectedEmp.inductions || []).map(ind => {
                                                const status = getExpiryStatus(ind.expiry);
                                                const isEditing = editingInductionId === ind.id;

                                                return (
                                                    <tr key={ind.id} className="hover:bg-slate-700/50">
                                                        {isEditing ? (
                                                            <>
                                                                <td className="px-4 py-2">
                                                                    <select
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editInductionForm.siteId}
                                                                        onChange={e => setEditInductionForm({ ...editInductionForm, siteId: e.target.value })}
                                                                    >
                                                                        <option value="">Select Site...</option>
                                                                        {activeSites.map(site => (
                                                                            <option key={site.id} value={site.id}>
                                                                                {site.customer} - {site.location}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input
                                                                        type="date"
                                                                        className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-xs text-white"
                                                                        value={editInductionForm.expiry}
                                                                        onChange={e => setEditInductionForm({ ...editInductionForm, expiry: e.target.value })}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2"></td>
                                                                <td className="px-4 py-2">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                const selectedSite = activeSites.find(s => s.id === editInductionForm.siteId);
                                                                                const siteName = selectedSite ? `${selectedSite.customer} - ${selectedSite.location}` : ind.name;

                                                                                const updatedInductions = selectedEmp.inductions.map(i =>
                                                                                    i.id === ind.id ? {
                                                                                        ...i,
                                                                                        siteId: editInductionForm.siteId,
                                                                                        name: siteName,
                                                                                        category: editInductionForm.category,
                                                                                        customCategory: editInductionForm.customCategory,
                                                                                        expiry: editInductionForm.expiry,
                                                                                        notes: editInductionForm.notes
                                                                                    } : i
                                                                                );
                                                                                onUpdateEmployee(selectedEmp.id, { inductions: updatedInductions });
                                                                                setSelectedEmp({ ...selectedEmp, inductions: updatedInductions });
                                                                                setEditingInductionId(null);
                                                                            }}
                                                                            className="text-green-400 hover:text-green-300"
                                                                            title="Save"
                                                                        >
                                                                            <Icons.Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingInductionId(null)}
                                                                            className="text-slate-400 hover:text-slate-300"
                                                                            title="Cancel"
                                                                        >
                                                                            <Icons.X size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td className="px-4 py-2">
                                                                    {(() => {
                                                                        const category = ind.category || 'site';
                                                                        const colors = getCategoryColors(category);
                                                                        return (
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors.bg} ${colors.border} ${colors.text}`}>
                                                                                {getCategoryIcon(category)} {getInductionLabel(ind)}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="px-4 py-2 font-medium text-slate-200">{ind.name}</td>
                                                                <td className="px-4 py-2 text-slate-300">{ind.expiry ? formatDate(ind.expiry) : '-'}</td>
                                                                <td className="px-4 py-2">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(status)} uppercase`}>
                                                                        {status === 'expired' ? 'Expired' : status === 'warning' ? 'Due Soon' : 'Active'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingInductionId(ind.id);
                                                                                setEditInductionForm({
                                                                                    siteId: ind.siteId || '',
                                                                                    category: ind.category || 'site',
                                                                                    customCategory: ind.customCategory || '',
                                                                                    expiry: ind.expiry || '',
                                                                                    notes: ind.notes || ''
                                                                                });
                                                                            }}
                                                                            className="text-blue-400 hover:text-blue-300"
                                                                            title="Edit"
                                                                        >
                                                                            <Icons.Edit size={14} />
                                                                        </button>
                                                                        <button
                                                                            className="text-red-400 hover:text-red-300"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!window.confirm(`Are you sure you want to delete the induction for \"${ind.name}\"?`)) return;
                                                                                const updatedInductions = selectedEmp.inductions.filter(i => i.id !== ind.id);
                                                                                onUpdateEmployee(selectedEmp.id, { inductions: updatedInductions });
                                                                                setSelectedEmp({ ...selectedEmp, inductions: updatedInductions });
                                                                            }}
                                                                            title="Delete"
                                                                        >
                                                                            <Icons.Trash size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {(!selectedEmp.inductions || selectedEmp.inductions.length === 0) && (
                                                <tr><td colSpan="4" className="p-4 text-center text-slate-500 italic">No inductions recorded. Add one above.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        ) : (
                            /* COMPLIANCE DASHBOARD */
                            <ComplianceDashboard employees={employees} onSelectEmp={setSelectedEmp} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
};
