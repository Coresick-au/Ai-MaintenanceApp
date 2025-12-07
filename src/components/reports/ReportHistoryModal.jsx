import React, { useState } from 'react';
import { Icons } from '../../constants/icons';
import { Button } from '../UIComponents';
import { formatDate } from '../../utils/helpers';

export const ReportHistoryModal = ({ asset, onClose, onRegeneratePDF, onViewReport, onEditReport, onNewReport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const reports = asset?.reports || [];

    // Filter reports based on search
    const filteredReports = reports.filter(report => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (report.jobNumber && report.jobNumber.toLowerCase().includes(searchLower)) ||
            (report.fileName && report.fileName.toLowerCase().includes(searchLower)) ||
            (report.data?.general?.technicians && report.data.general.technicians.toLowerCase().includes(searchLower))
        );
    });

    // Sort by date (newest first)
    const sortedReports = [...filteredReports].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    return (
        <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-5xl max-h-[85vh] rounded-xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-800">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Icons.History className="text-cyan-400" />
                                Service Report History
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                {asset?.name} ({asset?.code}) - {reports.length} report{reports.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {onNewReport && (
                                <button
                                    onClick={onNewReport}
                                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase rounded flex items-center gap-2 transition-colors"
                                >
                                    <Icons.Plus size={14} /> New Report
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded"
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icons.Search size={16} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by job number, filename, or technician..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Report List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {sortedReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                            <Icons.FileText size={48} className="opacity-20" />
                            <p className="text-sm">
                                {reports.length === 0
                                    ? 'No service reports found for this asset.'
                                    : 'No reports match your search.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedReports.map((report) => (
                                <div
                                    key={report.id}
                                    className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all group"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        {/* Report Info */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-white">{report.fileName || 'Untitled Report'}</h3>
                                                {report.jobNumber && (
                                                    <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded border border-cyan-500/30 font-mono">
                                                        Job #{report.jobNumber}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Icons.Calendar size={14} />
                                                    <span>Date: {formatDate(report.date)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Icons.FileText size={14} />
                                                    <span>Type: {report.type || 'Service Report'}</span>
                                                </div>
                                                {report.data?.general?.technicians && (
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Icons.User size={14} />
                                                        <span>Techs: {report.data.general.technicians}</span>
                                                    </div>
                                                )}
                                                {report.data?.general?.comments && (
                                                    <div className="flex items-center gap-2 text-slate-400 col-span-2">
                                                        <Icons.MessageCircle size={14} />
                                                        <span className="line-clamp-1">{report.data.general.comments}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="primary"
                                                className="text-xs"
                                                onClick={() => onRegeneratePDF(report)}
                                                title="Re-download PDF"
                                            >
                                                <Icons.Download size={14} /> Only PDF
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="text-xs"
                                                onClick={() => onViewReport(report)}
                                                title="View Report Details"
                                            >
                                                <Icons.Eye size={14} /> View
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                className="text-xs text-orange-400 hover:text-orange-300"
                                                onClick={() => onEditReport(report)}
                                                title="Edit Report (Warning: Modifying finalized report)"
                                            >
                                                <Icons.Edit size={14} /> Edit
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                        Showing {sortedReports.length} of {reports.length} report{reports.length !== 1 ? 's' : ''}
                    </p>
                    <Button variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};
