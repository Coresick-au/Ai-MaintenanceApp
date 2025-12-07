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
            <div className="col-span-2 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <h3 className="text-cyan-400 font-bold mb-4 uppercase text-xs flex items-center gap-2">
                    📷 Photo Evidence
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Existing Photos */}
                    {(formData.photos || []).map((photo) => (
                        <div key={photo.id} className="relative group aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-600">
                            <img src={photo.preview || photo.path} alt="Evidence" className="w-full h-full object-cover" />
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updatedPhotos = formData.photos.filter(p => p.id !== photo.id);
                                        onChange('photos', updatedPhotos);
                                    }}
                                    className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg>
                                </button>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs text-white truncate">{photo.name}</p>
                            </div>
                        </div>
                    ))}

                    {/* Upload Button */}
                    {!readOnly && (
                        <label className="cursor-pointer aspect-square bg-slate-700/50 hover:bg-slate-700 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-lg flex flex-col items-center justify-center transition-all group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-cyan-400 mb-2">
                                <path d="M5 12h14"></path>
                                <path d="M12 5v14"></path>
                            </svg>
                            <span className="text-xs text-slate-400 group-hover:text-cyan-400 font-bold">Add Photo</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    // Check if we're in Electron environment
                                    if (window.electronAPI && window.electronAPI.saveReportPhoto) {
                                        try {
                                            // In Electron, we need to get the file path
                                            // Since we can't access file.path directly in the renderer for security,
                                            // we'll use a FileReader to create a temporary blob and save it
                                            const reader = new FileReader();
                                            reader.onload = async (ev) => {
                                                // Create a temporary file path (this is a workaround)
                                                // In a real implementation, you might want to use a file dialog
                                                const newPhoto = {
                                                    id: Date.now(),
                                                    name: file.name,
                                                    preview: ev.target.result,
                                                    file: file // Store file for later upload
                                                };

                                                const currentPhotos = formData.photos || [];
                                                onChange('photos', [...currentPhotos, newPhoto]);
                                            };
                                            reader.readAsDataURL(file);
                                        } catch (error) {
                                            console.error('Error uploading photo:', error);
                                            alert('Failed to upload photo: ' + error.message);
                                        }
                                    } else {
                                        // Browser preview mode - just show the image
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const newPhoto = {
                                                id: Date.now(),
                                                name: file.name,
                                                preview: ev.target.result
                                            };
                                            const currentPhotos = formData.photos || [];
                                            onChange('photos', [...currentPhotos, newPhoto]);
                                        };
                                        reader.readAsDataURL(file);
                                    }

                                    // Reset input
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    )}
                </div>

                {(formData.photos || []).length > 0 && (
                    <p className="text-xs text-slate-400 mt-3">
                        {formData.photos.length} photo{formData.photos.length !== 1 ? 's' : ''} attached
                    </p>
                )}
            </div>
        </fieldset>
    );
};
