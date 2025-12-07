import React from 'react';

export const GeneralTab = ({ formData, onChange, site, asset, readOnly = false }) => {
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
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white font-mono"
                        value={formData.reportId}
                        onChange={e => handleChange('reportId', e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Job Number</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.jobNumber}
                        onChange={e => handleChange('jobNumber', e.target.value)}
                        placeholder="Optional"
                    />
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
                    <label className="text-xs text-slate-400 block mb-1">Next Service Date</label>
                    <input
                        type="date"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.nextServiceDate}
                        onChange={e => handleChange('nextServiceDate', e.target.value)}
                    />
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
                    <label className="text-xs text-slate-400 block mb-1">Technicians</label>
                    <input
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"
                        value={formData.technicians}
                        onChange={e => handleChange('technicians', e.target.value)}
                        placeholder="e.g., Tech A, Tech B"
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
        </fieldset>
    );
};
