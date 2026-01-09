import React, { useState, useMemo, useCallback } from 'react';
import * as ReactDOM from 'react-dom';
import Cropper from 'react-easy-crop';
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

// --- HELPER: Crop Image ---
const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise(resolve => image.onload = resolve);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas to 400x400 for consistent quality/size
    canvas.width = 400;
    canvas.height = 400;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        400,
        400
    );

    return canvas.toDataURL('image/jpeg', 0.8);
};

// --- HELPER: Calculate Years and Months from Date ---
const calculateDuration = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();

    let years = now.getFullYear() - date.getFullYear();
    let months = now.getMonth() - date.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    // Adjust if day hasn't passed yet this month
    if (now.getDate() < date.getDate()) {
        months--;
        if (months < 0) {
            years--;
            months += 12;
        }
    }

    if (years < 0) return null;

    if (years === 0) {
        return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
        return `${years}y ${months}m`;
    }
};

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
                                    <th className="px-4 py-2">Team Member</th>
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
                                        onClick={() => onSelectEmp({ ...item.emp })}
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

export const EmployeeManager = ({ isOpen, onClose, employees, sites, customers, onAddEmployee, onUpdateEmployee, onDeleteEmployee }) => {
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [newEmpForm, setNewEmpForm] = useState({
        name: '',
        role: 'Service Technician',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        startDate: '',
        usiNumber: '',
        photoUrl: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        status: 'active'
    });
    const [newCertForm, setNewCertForm] = useState({ name: '', provider: '', expiry: '', pdfUrl: '', noExpiry: false });
    const [newInductionForm, setNewInductionForm] = useState({ siteId: '', category: 'site', customCategory: '', expiry: '', notes: '' });

    // NEW: Edit states
    const [editingCertId, setEditingCertId] = useState(null);
    const [editCertForm, setEditCertForm] = useState({ name: '', provider: '', expiry: '', pdfUrl: '' });
    const [editingInductionId, setEditingInductionId] = useState(null);
    const [editInductionForm, setEditInductionForm] = useState({ siteId: '', category: 'site', customCategory: '', expiry: '', notes: '' });

    // NEW: Employee edit state
    const [isEditingEmployee, setIsEditingEmployee] = useState(false);
    const [editEmployeeForm, setEditEmployeeForm] = useState(null);

    // Photo cropping states
    const [tempPhotoUrl, setTempPhotoUrl] = useState(null); // The raw image picked by user
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);

    // Sort state for certifications
    const [certSortOrder, setCertSortOrder] = useState('asc'); // 'asc' or 'desc'

    // Collect managed sites from customers for induction dropdown
    const managedSites = useMemo(() => {
        const allManagedSites = [];
        (customers || []).forEach(customer => {
            (customer.managedSites || []).forEach(site => {
                allManagedSites.push({
                    id: site.id,
                    name: site.name,
                    location: site.location || '',
                    customer: customer.name,
                    customerId: customer.id
                });
            });
        });
        return allManagedSites;
    }, [customers]);

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
                        <Icons.Users /> Team Tracker
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
                                onClick={() => {
                                    setSelectedEmp(null);
                                    setIsEditingEmployee(false);
                                    setEditEmployeeForm(null);
                                }}
                                className={`w-full px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-left ${selectedEmp === null
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                            >
                                <Icons.Activity size={16} /> Compliance Overview
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedEmp('new');
                                    setIsEditingEmployee(false);
                                    setEditEmployeeForm(null);
                                }}
                                className={`w-full px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-left ${selectedEmp === 'new'
                                    ? 'bg-cyan-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    }`}
                            >
                                <Icons.Plus size={16} /> Add Team Member
                            </button>
                        </div>

                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Team Members</div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {employees.filter(emp => emp.status !== 'archived').map(emp => {
                                const hasCertIssues = emp.certifications?.some(cert => ['expired', 'warning'].includes(getExpiryStatus(cert.expiry)));
                                const hasInductionIssues = emp.inductions?.some(ind => ['expired', 'warning'].includes(getExpiryStatus(ind.expiry)));
                                const hasIssues = hasCertIssues || hasInductionIssues;

                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => {
                                            setSelectedEmp({ ...emp });
                                            setIsEditingEmployee(false);
                                            setEditEmployeeForm(null);
                                        }}
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
                                View Archived Team Members ({employees.filter(emp => emp.status === 'archived').length})
                            </summary>
                            <div className="space-y-2 mt-2">
                                {employees.filter(emp => emp.status === 'archived').map(emp => (
                                    <div
                                        key={emp.id}
                                        onClick={() => {
                                            setSelectedEmp({ ...emp });
                                            setIsEditingEmployee(false);
                                            setEditEmployeeForm(null);
                                        }}
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

                                    {/* USI Number Field */}
                                    <input
                                        placeholder="USI Number (Unique Student Identifier)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        value={newEmpForm.usiNumber}
                                        onChange={e => setNewEmpForm({ ...newEmpForm, usiNumber: e.target.value })}
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
                                                dateOfBirth: '',
                                                startDate: '',
                                                usiNumber: '',
                                                photoUrl: '',
                                                emergencyContactName: '',
                                                emergencyContactPhone: '',
                                                emergencyContactRelationship: '',
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
                                    <div className="flex gap-1.5 flex-wrap justify-end">
                                        <button
                                            onClick={() => {
                                                setIsEditingEmployee(true);
                                                setEditEmployeeForm({
                                                    name: selectedEmp.name || '',
                                                    role: selectedEmp.role || '',
                                                    email: selectedEmp.email || '',
                                                    phone: selectedEmp.phone || '',
                                                    address: selectedEmp.address || '',
                                                    dateOfBirth: selectedEmp.dateOfBirth || '',
                                                    startDate: selectedEmp.startDate || '',
                                                    usiNumber: selectedEmp.usiNumber || '',
                                                    photoUrl: selectedEmp.photoUrl || '',
                                                    emergencyContactName: selectedEmp.emergencyContactName || '',
                                                    emergencyContactPhone: selectedEmp.emergencyContactPhone || '',
                                                    emergencyContactRelationship: selectedEmp.emergencyContactRelationship || ''
                                                });
                                            }}
                                            className="px-2.5 py-1.5 text-xs rounded transition-colors bg-blue-700 hover:bg-blue-600 text-white flex items-center gap-1"
                                            title="Edit employee details"
                                        >
                                            <Icons.Edit size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm(`Are you sure you want to permanently delete ${selectedEmp.name}? This action cannot be undone.`)) return;
                                                if (!window.confirm(`FINAL WARNING: Deleting ${selectedEmp.name} will remove all their data permanently. Continue?`)) return;
                                                if (onDeleteEmployee) {
                                                    await onDeleteEmployee(selectedEmp.id);
                                                    setSelectedEmp(null);
                                                    setIsEditingEmployee(false);
                                                    setEditEmployeeForm(null);
                                                } else {
                                                    // Fallback if prop missing
                                                    if (onUpdateEmployee) {
                                                        onUpdateEmployee(selectedEmp.id, { status: 'archived' });
                                                        setSelectedEmp(null);
                                                    }
                                                }
                                            }}
                                            className="px-2.5 py-1.5 text-xs rounded transition-colors bg-red-900 hover:bg-red-800 text-white flex items-center gap-1"
                                            title="Delete employee permanently"
                                        >
                                            <Icons.Trash size={12} /> Delete
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newStatus = selectedEmp.status === 'active' ? 'archived' : 'active';
                                                onUpdateEmployee(selectedEmp.id, { status: newStatus });
                                                setSelectedEmp({ ...selectedEmp, status: newStatus });
                                            }}
                                            className={`px-2.5 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${selectedEmp.status === 'active'
                                                ? 'bg-orange-700 hover:bg-orange-600 text-white'
                                                : 'bg-green-700 hover:bg-green-600 text-white'}`}
                                            title={selectedEmp.status === 'active' ? 'Archive employee' : 'Restore employee'}
                                        >
                                            <Icons.Archive size={12} /> {selectedEmp.status === 'active' ? 'Archive' : 'Restore'}
                                        </button>
                                        <button
                                            onClick={() => setSelectedEmp(null)}
                                            className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors flex items-center gap-1"
                                        >
                                            <Icons.X size={12} /> Close
                                        </button>
                                    </div>
                                </div>

                                {/* Personnel Details Card - Editable */}
                                {isEditingEmployee ? (
                                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
                                        <h3 className="font-bold text-slate-200 mb-3">Edit Employee Details</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Name</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.name}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Role</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.role}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, role: e.target.value })}
                                                    list="role-suggestions"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.email}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, email: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Phone</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.phone}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, phone: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-slate-400 block mb-1">Address</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.address}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, address: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.dateOfBirth}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, dateOfBirth: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.startDate}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-slate-400 block mb-1">USI Number</label>
                                                <input
                                                    placeholder="Unique Student Identifier"
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.usiNumber}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, usiNumber: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-slate-400 block mb-1">Staff Photo</label>
                                                <div className="flex gap-2 items-start">
                                                    <input
                                                        id="photo-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (e) => {
                                                                setTempPhotoUrl(e.target.result);
                                                                setIsCropping(true);
                                                                setZoom(1);
                                                                setCrop({ x: 0, y: 0 });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <label
                                                        htmlFor="photo-upload"
                                                        className="px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded cursor-pointer transition-colors"
                                                    >
                                                        {editEmployeeForm.photoUrl ? 'Change Photo' : 'Choose File'}
                                                    </label>
                                                    {editEmployeeForm.photoUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditEmployeeForm({ ...editEmployeeForm, photoUrl: '' })}
                                                            className="px-3 py-2 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                                                            title="Remove photo"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                {editEmployeeForm.photoUrl && (
                                                    <div className="mt-2">
                                                        <img
                                                            src={editEmployeeForm.photoUrl}
                                                            alt="Preview"
                                                            className="w-24 h-24 rounded object-cover border border-slate-600"
                                                        />
                                                        <p className="text-[10px] text-slate-500 mt-1">
                                                            Optimized Size: {(editEmployeeForm.photoUrl.length * 0.75 / 1024).toFixed(0)}KB
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Emergency Contact Name</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.emergencyContactName}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, emergencyContactName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 block mb-1">Relationship</label>
                                                <input
                                                    placeholder="e.g. Wife, Daughter, Brother"
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.emergencyContactRelationship}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, emergencyContactRelationship: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-slate-400 block mb-1">Emergency Contact Phone</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                                                    value={editEmployeeForm.emergencyContactPhone}
                                                    onChange={e => setEditEmployeeForm({ ...editEmployeeForm, emergencyContactPhone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => {
                                                    onUpdateEmployee(selectedEmp.id, editEmployeeForm);
                                                    setSelectedEmp({ ...selectedEmp, ...editEmployeeForm });
                                                    setIsEditingEmployee(false);
                                                }}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => setIsEditingEmployee(false)}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                                        <h3 className="font-bold text-slate-200 mb-3">Personnel Details</h3>
                                        <div className="flex gap-4">
                                            {/* Photo */}
                                            <div className="flex-shrink-0">
                                                {selectedEmp.photoUrl ? (
                                                    <img
                                                        src={selectedEmp.photoUrl}
                                                        alt={selectedEmp.name}
                                                        className="w-32 h-32 rounded-lg object-cover border-2 border-slate-600"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-32 h-32 rounded-lg bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
                                                        <Icons.User className="w-16 h-16 text-slate-500" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Details */}
                                            <div className="grid grid-cols-2 gap-y-2 text-sm flex-1">
                                                <div className="text-slate-500">Address:</div>
                                                <div className="text-slate-300">{selectedEmp.address || 'N/A'}</div>

                                                <div className="text-slate-500">Date of Birth:</div>
                                                <div className="text-slate-300">
                                                    {selectedEmp.dateOfBirth ? formatDate(selectedEmp.dateOfBirth) : 'N/A'}
                                                    {selectedEmp.dateOfBirth && calculateDuration(selectedEmp.dateOfBirth) && (
                                                        <span className="text-slate-500 ml-2">({calculateDuration(selectedEmp.dateOfBirth)} old)</span>
                                                    )}
                                                </div>

                                                <div className="text-slate-500">Start Date:</div>
                                                <div className="text-slate-300">
                                                    {selectedEmp.startDate ? formatDate(selectedEmp.startDate) : 'N/A'}
                                                    {selectedEmp.startDate && calculateDuration(selectedEmp.startDate) && (
                                                        <span className="text-slate-500 ml-2">({calculateDuration(selectedEmp.startDate)})</span>
                                                    )}
                                                </div>

                                                <div className="text-slate-500">USI Number:</div>
                                                <div className="text-slate-300">{selectedEmp.usiNumber || 'N/A'}</div>

                                                <div className="text-slate-500">Emergency Contact Name:</div>
                                                <div className="text-slate-300">
                                                    {selectedEmp.emergencyContactName || 'N/A'}
                                                    {selectedEmp.emergencyContactRelationship && (
                                                        <span className="text-slate-500 ml-1">({selectedEmp.emergencyContactRelationship})</span>
                                                    )}
                                                </div>

                                                <div className="text-slate-500">Emergency Contact Phone:</div>
                                                <div className="text-slate-300">{selectedEmp.emergencyContactPhone || 'N/A'}</div>

                                                <div className="text-slate-500">Status:</div>
                                                <div className={`font-bold uppercase text-xs ${selectedEmp.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {selectedEmp.status || 'active'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CERTIFICATIONS TABLE */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-200">Certifications & Training</h3>
                                    </div>

                                    {/* Add Cert Form (Inline) */}
                                    <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                                        <div className="grid grid-cols-6 gap-2 mb-2">
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
                                                className="bg-slate-900 border border-slate-600 rounded p-2 text-xs text-white focus:border-cyan-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                value={newCertForm.noExpiry ? '' : newCertForm.expiry}
                                                onChange={e => setNewCertForm({ ...newCertForm, expiry: e.target.value })}
                                                title="Expiry Date"
                                                disabled={newCertForm.noExpiry}
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
                                                        name: newCertForm.name,
                                                        provider: newCertForm.provider,
                                                        expiry: newCertForm.noExpiry ? 'N/A' : newCertForm.expiry,
                                                        pdfUrl: newCertForm.pdfUrl,
                                                        id: `cert-${Date.now()}`,
                                                        date: new Date().toISOString().split('T')[0]
                                                    }];
                                                    onUpdateEmployee(selectedEmp.id, { certifications: updatedCerts });
                                                    setNewCertForm({ name: '', provider: '', expiry: '', pdfUrl: '', noExpiry: false });
                                                    setSelectedEmp({ ...selectedEmp, certifications: updatedCerts });
                                                }}
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={newCertForm.noExpiry}
                                                onChange={e => setNewCertForm({ ...newCertForm, noExpiry: e.target.checked, expiry: e.target.checked ? '' : newCertForm.expiry })}
                                                className="w-3 h-3 rounded border-slate-600 bg-slate-900 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                            />
                                            No Expiry Date (e.g., lifetime certification)
                                        </label>
                                    </div>

                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900">
                                            <tr>
                                                <th className="px-4 py-2">Certification</th>
                                                <th className="px-4 py-2">Provider</th>
                                                <th
                                                    className="px-4 py-2 cursor-pointer hover:text-slate-300 select-none"
                                                    onClick={() => setCertSortOrder(certSortOrder === 'asc' ? 'desc' : 'asc')}
                                                    title="Click to sort by expiry date"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Expiry
                                                        <span className="text-[10px]">{certSortOrder === 'asc' ? '▲' : '▼'}</span>
                                                    </div>
                                                </th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2 w-12">PDF</th>
                                                <th className="px-4 py-2 w-20">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {(selectedEmp.certifications || [])
                                                .sort((a, b) => {
                                                    // Handle N/A values - always put them at the end
                                                    if (a.expiry === 'N/A' && b.expiry === 'N/A') return 0;
                                                    if (a.expiry === 'N/A') return 1;
                                                    if (b.expiry === 'N/A') return -1;

                                                    // Handle empty values
                                                    if (!a.expiry && !b.expiry) return 0;
                                                    if (!a.expiry) return 1;
                                                    if (!b.expiry) return -1;

                                                    // Sort by date
                                                    const dateA = new Date(a.expiry);
                                                    const dateB = new Date(b.expiry);
                                                    return certSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                                                })
                                                .map(cert => {
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
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getStatusColor(status)} uppercase`}>
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
                                                {managedSites.map(site => (
                                                    <option key={site.id} value={site.id}>
                                                        {site.customer} - {site.name}{site.location ? ` (${site.location})` : ''}
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

                                                    const selectedSite = managedSites.find(s => s.id === newInductionForm.siteId);
                                                    const siteName = selectedSite ? `${selectedSite.customer} - ${selectedSite.name}` : 'Unknown Site';

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
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getStatusColor(status)} uppercase`}>
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
                            <ComplianceDashboard employees={employees} onSelectEmp={(emp) => {
                                setSelectedEmp(emp);
                                setIsEditingEmployee(false);
                                setEditEmployeeForm(null);
                            }} />
                        )}
                    </div>
                </div>

                {/* NEW: Photo Cropper Modal */}
                {isCropping && tempPhotoUrl && (
                    <div className="fixed inset-0 z-[100] bg-slate-950/90 flex flex-col items-center justify-center p-4">
                        <div className="bg-slate-900 rounded-xl w-full max-w-lg overflow-hidden border border-slate-700 shadow-2xl">
                            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Center & Crop Photo</h3>
                                <button onClick={() => setIsCropping(false)} className="text-slate-400 hover:text-white">
                                    <Icons.X size={20} />
                                </button>
                            </div>

                            <div className="relative h-80 bg-black">
                                <Cropper
                                    image={tempPhotoUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                                />
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-slate-400">Zoom</span>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        value={zoom}
                                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                                        className="flex-1 accent-cyan-500"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsCropping(false)}
                                        className="flex-1 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const cropped = await getCroppedImg(tempPhotoUrl, croppedAreaPixels);
                                                setEditEmployeeForm({ ...editEmployeeForm, photoUrl: cropped });
                                                setIsCropping(false);
                                                setTempPhotoUrl(null);
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        className="flex-1 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                                    >
                                        Apply Crop
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-400">Drag to position • Scroll or use slider to zoom</p>
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
};
