import React from 'react';

export const GeneralTab = ({ formData, onChange, site, asset, employees = [], readOnly = false, validationErrors = {} }) => {
    const handleChange = (field, value) => {
        onChange(field, value);
    };

    return (
        <fieldset disabled={readOnly} className="grid grid-cols-2 gap-6 max-w-4xl mx-auto block">
            {/* Customer Info */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs">Customer Info</h3>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Customer Name</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.customerName}
                        onChange={e => handleChange('customerName', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Site Location</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.siteLocation}
                        onChange={e => handleChange('siteLocation', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Contact Name</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.contactName}
                        onChange={e => handleChange('contactName', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Contact Email</label>
                    <input
                        type="email"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.contactEmail}
                        onChange={e => handleChange('contactEmail', e.target.value)}
                    />
                </div>
            </div>

            {/* Job Info */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs">Job Info</h3>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Report ID</label>
                    <input
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-400 font-mono cursor-not-allowed"
                        value={formData.reportId}
                        readOnly
                        title="Auto-generated from date, job number, and asset code"
                    />
                    <p className="text-xs text-slate-500 mt-1 italic">
                        Auto-generated: Updates when Job Number changes
                    </p>
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Job Number <span className="text-red-400">*</span></label>
                    <input
                        className={`w-full bg-slate-900 border rounded p-2 text-sm text-white ${validationErrors.jobNumber ? 'border-red-500' : 'border-slate-600'
                            }`}
                        value={formData.jobNumber}
                        onChange={e => handleChange('jobNumber', e.target.value)}
                        placeholder="Required"
                    />
                    {validationErrors.jobNumber && (
                        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            {validationErrors.jobNumber}
                        </p>
                    )}
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Service Date</label>
                    <input
                        type="date"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.serviceDate}
                        onChange={e => handleChange('serviceDate', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">
                        Next Service Date
                        {asset?.serviceSchedule && (
                            <span className="text-cyan-500 ml-1">({asset.serviceSchedule})</span>
                        )}
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-400 cursor-not-allowed opacity-75"
                            value={formData.nextServiceDate}
                            readOnly
                            title="Automatically calculated based on service schedule"
                        />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                            {/* Lock Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 italic flex items-center gap-1">
                        {/* Info Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Auto-calculated from '{asset?.serviceSchedule || 'Yearly'}' schedule
                    </p>
                </div>
            </div>

            {/* Equipment Info */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs">Equipment Info</h3>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Asset Name</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.assetName}
                        onChange={e => handleChange('assetName', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Conveyor Number</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.conveyorNumber}
                        onChange={e => handleChange('conveyorNumber', e.target.value)}
                    />
                </div>
            </div>

            {/* Service Info */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs">Service Details</h3>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Technicians <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        className={`w-full bg-slate-900 border rounded p-2 text-sm text-white ${validationErrors.technicians ? 'border-red-500' : 'border-slate-600'
                            }`}
                        value={formData.technicians}
                        onChange={e => handleChange('technicians', e.target.value)}
                        placeholder="e.g., John Doe, Jane Smith"
                        list="technician-suggestions"
                    />
                    {validationErrors.technicians && (
                        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            {validationErrors.technicians}
                        </p>
                    )}
                    <datalist id="technician-suggestions">
                        {employees.map(emp => (
                            <option
                                key={emp.id}
                                value={`${emp.name}${emp.phone ? ` (${emp.phone})` : ''}${emp.email ? ` | ${emp.email}` : ''}`}
                            >
                                {emp.name} - {emp.role || 'No role'}
                            </option>
                        ))}
                    </datalist>
                    <p className="text-xs text-slate-500 mt-1">
                        Type to search employees or enter custom names (comma-separated)
                    </p>
                </div>
                <div>
                    <label className="text-xs text-amber-500 block mb-1 font-bold">Internal Comments (Not on PDF)</label>
                    <textarea
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                        value={formData.internalComments || ''}
                        onChange={e => handleChange('internalComments', e.target.value)}
                        placeholder="Private notes for team..."
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Comments / Recommendations</label>
                    <textarea
                        rows={4}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.comments}
                        onChange={e => handleChange('comments', e.target.value)}
                        placeholder="Enter service notes here..."
                    />
                </div>
            </div>

            {/* Photo Evidence Section */}
            <div className="col-span-2 bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-4">
                <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs flex items-center gap-2">
                    📁 Photo Evidence
                </h3>

                {/* Folder Name / Report ID with Copy Button */}
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Folder Name (Report ID)</label>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white font-mono cursor-not-allowed"
                            value={formData.reportId}
                            readOnly
                            title="Use this as your folder name for storing photos"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(formData.reportId);
                                // Optional: Show a brief success indicator
                                const btn = event.target.closest('button');
                                const originalText = btn.innerHTML;
                                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                setTimeout(() => {
                                    btn.innerHTML = originalText;
                                }, 1500);
                            }}
                            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium flex items-center gap-2 transition-colors"
                            title="Copy folder name to clipboard"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Copy
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 italic">
                        Create a folder with this name for storing photos (e.g., in SharePoint or Google Drive)
                    </p>
                </div>

                {/* Photos Link Input */}
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Photos Link</label>
                    <input
                        type="url"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.photosLink || ''}
                        onChange={e => handleChange('photosLink', e.target.value)}
                        placeholder="Paste link to SharePoint/Drive folder..."
                        readOnly={readOnly}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Link to the folder containing photos for this report
                    </p>
                </div>
            </div>
        </fieldset>
    );
};
