import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { TemplateModal } from './TemplateModal';
import { useResizableColumns } from '../../hooks/useResizableColumns';

interface Template {
    id: string;
    name: string;
    type: string;
    description?: string;
    pricingMatrix?: Array<{ width: number; price: number }>;
    basePrice?: number;
    setupFee?: number;
    laborMinutes?: number;
    internalBOM?: any[];
    materialMultiplier?: { [key: string]: number };
}

export const TemplateManager = () => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const tableRef = useRef(null);

    // Resizable columns
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([200, 120, 100, 100, 100, 100, 100]);

    // Load templates from Firestore
    const loadTemplates = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'manufactured_templates'));
            const templateList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Template));
            setTemplates(templateList);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    // Filter templates
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || template.type === filterType;
        return matchesSearch && matchesType;
    });

    // Get unique types for filter
    const uniqueTypes = Array.from(new Set(templates.map(t => t.type)));

    const handleAdd = () => {
        setEditingTemplate(null);
        setShowModal(true);
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setShowModal(true);
    };

    const handleDelete = async (templateId: string, templateName: string) => {
        if (!confirm(`Are you sure you want to delete template "${templateName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'manufactured_templates', templateId));
            await loadTemplates(); // Reload list
            alert('Template deleted successfully');
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template');
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setEditingTemplate(null);
        loadTemplates(); // Reload after add/edit
    };

    const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    return (
        <div className="flex flex-col h-full items-center">
            <div className="w-full max-w-fit space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manufactured Part Templates</h1>
                        <p className="text-sm text-slate-400 mt-1">Manage design templates for parametric costing</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('openManufacturedCalculator'))}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Icons.Calculator size={18} />
                            Calculate Cost
                        </button>
                        <button
                            onClick={handleAdd}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Icons.Plus size={18} />
                            New Template
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search templates..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Types</option>
                        {uniqueTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Templates Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Icons.Loader size={32} className="animate-spin text-purple-400" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                        <Icons.Package size={48} className="mx-auto mb-3 text-slate-600" />
                        <p className="text-slate-400">
                            {searchTerm || filterType !== 'all' ? 'No templates match your search' : 'No templates yet'}
                        </p>
                        {!searchTerm && filterType === 'all' && (
                            <button
                                onClick={handleAdd}
                                className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
                            >
                                Create your first template
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                                <thead className="bg-slate-900 border-b border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[0]}px` }}>
                                            <div className="column-content">Name</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(0, e)} onDoubleClick={() => autoFitColumn(0, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[1]}px` }}>
                                            <div className="column-content">Type</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(1, e)} onDoubleClick={() => autoFitColumn(1, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[2]}px` }}>
                                            <div className="column-content">Matrix</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[3]}px` }}>
                                            <div className="column-content">Base Price</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(3, e)} onDoubleClick={() => autoFitColumn(3, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[4]}px` }}>
                                            <div className="column-content">Labor</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(4, e)} onDoubleClick={() => autoFitColumn(4, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[5]}px` }}>
                                            <div className="column-content">BOM Items</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(5, e)} onDoubleClick={() => autoFitColumn(5, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[6]}px` }}>
                                            <div className="column-content">Actions</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filteredTemplates.map(template => (
                                        <tr key={template.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-white">{template.name}</div>
                                                {template.description && (
                                                    <div className="text-xs text-slate-400">{template.description}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                                                    {template.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">
                                                {template.pricingMatrix?.length || 0} options
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-mono text-cyan-400">
                                                {template.basePrice ? formatMoney(template.basePrice) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">
                                                {template.laborMinutes ? `${template.laborMinutes}m` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-slate-300">
                                                {template.internalBOM?.length || 0}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(template)}
                                                        className="p-1.5 hover:bg-slate-600 rounded text-cyan-400 transition-colors"
                                                        title="Edit template"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(template.id, template.name)}
                                                        className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                        title="Delete template"
                                                    >
                                                        <Icons.Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Template Modal */}
                {showModal && (
                    <TemplateModal
                        isOpen={showModal}
                        onClose={handleModalClose}
                        editingTemplate={editingTemplate}
                    />
                )}
            </div>
        </div>
    );
};
