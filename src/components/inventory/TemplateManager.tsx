import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { TemplateModal } from './TemplateModal';

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
        <div className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(template => (
                        <div
                            key={template.id}
                            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition-colors"
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white">{template.name}</h3>
                                    <span className="inline-block mt-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                                        {template.type}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-1.5 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
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
                            </div>

                            {/* Description */}
                            {template.description && (
                                <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                            )}

                            {/* Template Details */}
                            <div className="space-y-2 text-sm">
                                {template.pricingMatrix && template.pricingMatrix.length > 0 && (
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-slate-400">Pricing Matrix:</span>
                                        <span>{template.pricingMatrix.length} width options</span>
                                    </div>
                                )}
                                {template.basePrice && (
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-slate-400">Base Price:</span>
                                        <span className="font-mono">{formatMoney(template.basePrice)}</span>
                                    </div>
                                )}
                                {template.laborMinutes && (
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-slate-400">Labor Time:</span>
                                        <span>{template.laborMinutes} mins</span>
                                    </div>
                                )}
                                {template.internalBOM && template.internalBOM.length > 0 && (
                                    <div className="flex items-center justify-between text-slate-300">
                                        <span className="text-slate-400">BOM Items:</span>
                                        <span>{template.internalBOM.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
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
    );
};
