import React, { useState } from 'react';
import { Modal, Button } from './UIComponents';
import { Icons } from '../constants/icons';
import { formatDate } from '../utils/helpers';
import { getExpiryStatus, getStatusColorClasses } from '../utils/employeeUtils';

export const EmployeeManager = ({ isOpen, onClose, employees, onAddEmployee, onUpdateEmployee }) => {
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [newEmpForm, setNewEmpForm] = useState({ name: '', role: 'Technician', email: '', phone: '' });
    const [newCertForm, setNewCertForm] = useState({ name: '', provider: '', expiry: '', cost: '' });

    if (!isOpen) return null;

    // Helper to get status color
    const getStatusColor = (status) => {
        if (status === 'expired') return 'text-red-400 bg-red-900/20 border-red-900';
        if (status === 'warning') return 'text-yellow-400 bg-yellow-900/20 border-yellow-900';
        return 'text-green-400 bg-green-900/20 border-green-900';
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-7xl h-[90vh] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Technician & Training Tracker</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 gap-6 p-6 overflow-hidden">

                    {/* LEFT: EMPLOYEE LIST */}
                    <div className="w-1/3 border-r border-slate-700 pr-4 flex flex-col">
                        <div className="mb-4">
                            <button
                                onClick={() => setSelectedEmp('new')}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Icons.Plus size={16} /> Add Technician
                            </button>
                        </div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {employees.map(emp => {
                                const hasIssues = emp.certifications?.some(cert => {
                                    const status = getExpiryStatus(cert.expiry);
                                    return status === 'expired' || status === 'warning';
                                });

                                return (
                                    <div
                                        key={emp.id}
                                        onClick={() => setSelectedEmp(emp)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedEmp?.id === emp.id
                                            ? 'bg-cyan-900/30 border-cyan-500'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="font-bold text-slate-200">{emp.name}</div>
                                        <div className="text-xs text-slate-400">{emp.role}</div>

                                        {/* Mini Status Dots */}
                                        {hasIssues && (
                                            <div className="flex gap-1 mt-2">
                                                {emp.certifications.map(cert => {
                                                    const status = getExpiryStatus(cert.expiry);
                                                    if (status === 'valid') return null;
                                                    return (
                                                        <div
                                                            key={cert.id}
                                                            className={`w-2 h-2 rounded-full ${status === 'expired' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                                            title={`${cert.name} ${status}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {employees.length === 0 && (
                                <div className="text-center text-slate-500 italic py-8">
                                    No technicians yet. Click "Add Technician" to get started.
                                </div>
                            )}
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
                                        placeholder="Full Name"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        value={newEmpForm.name}
                                        onChange={e => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                                    />
                                    <input
                                        placeholder="Role (e.g. Lead Tech)"
                                        className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                        value={newEmpForm.role}
                                        onChange={e => setNewEmpForm({ ...newEmpForm, role: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            placeholder="Phone"
                                            className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            value={newEmpForm.phone}
                                            onChange={e => setNewEmpForm({ ...newEmpForm, phone: e.target.value })}
                                        />
                                        <input
                                            placeholder="Email"
                                            className="bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-cyan-500 outline-none"
                                            value={newEmpForm.email}
                                            onChange={e => setNewEmpForm({ ...newEmpForm, email: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!newEmpForm.name) return;
                                            onAddEmployee(newEmpForm);
                                            setSelectedEmp(null);
                                            setNewEmpForm({ name: '', role: 'Technician', email: '', phone: '' });
                                        }}
                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                                    >
                                        Save Technician
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
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEmp(null)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>

                                {/* CERTIFICATIONS TABLE */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-200">Certifications & Training</h3>
                                    </div>

                                    {/* Add Cert Form (Inline) */}
                                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 grid grid-cols-5 gap-2">
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
                                        <button
                                            onClick={() => {
                                                if (!newCertForm.name) return;
                                                const updatedCerts = [...(selectedEmp.certifications || []), {
                                                    ...newCertForm,
                                                    id: `cert-${Date.now()}`,
                                                    date: new Date().toISOString().split('T')[0]
                                                }];
                                                onUpdateEmployee(selectedEmp.id, { certifications: updatedCerts });
                                                setNewCertForm({ name: '', provider: '', expiry: '', cost: '' });
                                                // Update local state
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
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {(selectedEmp.certifications || []).map(cert => {
                                                const status = getExpiryStatus(cert.expiry);
                                                return (
                                                    <tr key={cert.id} className="hover:bg-slate-700/50">
                                                        <td className="px-4 py-2 font-medium text-slate-200">{cert.name}</td>
                                                        <td className="px-4 py-2 text-slate-400">{cert.provider || '-'}</td>
                                                        <td className="px-4 py-2 text-slate-300">{cert.expiry ? formatDate(cert.expiry) : '-'}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(status)} uppercase`}>
                                                                {status === 'valid' ? 'Active' : status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {(!selectedEmp.certifications || selectedEmp.certifications.length === 0) && (
                                                <tr><td colSpan="4" className="p-4 text-center text-slate-500 italic">No certifications yet. Add one above.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <Icons.Users size={48} className="mb-4 opacity-20" />
                                <p>Select a technician to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
