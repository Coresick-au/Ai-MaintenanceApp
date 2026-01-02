import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import {
    addWeigherModel,
    updateWeigherModel,
    deleteWeigherModel
} from '../../services/specializedComponentsService';
import { useResizableColumns } from '../../hooks/useResizableColumns';

export const WeigherModelConfig = () => {
    const [models, setModels] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        loadCells: 4,
        idlerFrames: 4,
        description: ''
    });
    const tableRef = React.useRef(null);

    // Resizable columns configuration
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([120, 250, 100, 120, 300, 100]);

    // Load weigher models from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'weigher_models'),
            (snapshot) => {
                const modelsData = snapshot.docs.map(doc => doc.data());
                modelsData.sort((a, b) => a.code.localeCompare(b.code));
                setModels(modelsData);
            },
            (error) => {
                console.error('Error loading weigher models:', error);
                setError('Failed to load weigher models');
            }
        );

        return () => unsubscribe();
    }, []);

    const handleOpenForm = (model = null) => {
        if (model) {
            setEditingModel(model);
            setFormData({
                code: model.code,
                name: model.name,
                loadCells: model.loadCells,
                idlerFrames: model.idlerFrames,
                description: model.description || ''
            });
        } else {
            setEditingModel(null);
            setFormData({
                code: '',
                name: '',
                loadCells: 4,
                idlerFrames: 4,
                description: ''
            });
        }
        setIsFormOpen(true);
        setError('');
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingModel(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const modelData = {
                code: formData.code.trim(),
                name: formData.name.trim(),
                loadCells: parseInt(formData.loadCells),
                idlerFrames: parseInt(formData.idlerFrames),
                description: formData.description.trim()
            };

            if (editingModel) {
                await updateWeigherModel(editingModel.id, modelData);
            } else {
                await addWeigherModel(modelData);
            }

            handleCloseForm();
        } catch (err) {
            setError(err.message || 'Failed to save weigher model');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (modelId) => {
        if (!confirm('Are you sure you want to delete this weigher model? This will fail if the model is in use.')) return;

        try {
            await deleteWeigherModel(modelId);
        } catch (err) {
            setError(err.message || 'Failed to delete weigher model');
        }
    };

    return (
        <div className="flex flex-col h-full items-center">
            <div className="w-full max-w-fit space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">Weigher Models</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Manage precision belt weigher model configurations
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenForm()}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                        <Icons.Plus size={18} />
                        Add Model
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                            <thead className="bg-slate-750 border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[0]}px` }}>
                                        <div className="column-content">Code</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(0, e)} onDoubleClick={() => autoFitColumn(0, tableRef)} onClick={(e) => e.stopPropagation()} />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[1]}px` }}>
                                        <div className="column-content">Name</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(1, e)} onDoubleClick={() => autoFitColumn(1, tableRef)} onClick={(e) => e.stopPropagation()} />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[2]}px` }}>
                                        <div className="column-content">Load Cells</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[3]}px` }}>
                                        <div className="column-content">Idler Frames</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(3, e)} onDoubleClick={() => autoFitColumn(3, tableRef)} onClick={(e) => e.stopPropagation()} />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[4]}px` }}>
                                        <div className="column-content">Description</div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(4, e)} onDoubleClick={() => autoFitColumn(4, tableRef)} onClick={(e) => e.stopPropagation()} />
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[5]}px` }}>
                                        <div className="column-content">Actions</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {models.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                                            No weigher models configured yet. Click "Add Model" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    models.map(model => (
                                        <tr key={model.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-white">{model.code}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{model.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{model.loadCells}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{model.idlerFrames}</td>
                                            <td className="px-4 py-3 text-sm text-slate-400">{model.description}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenForm(model)}
                                                        className="p-1.5 hover:bg-slate-600 rounded text-cyan-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(model.id)}
                                                        className="p-1.5 hover:bg-slate-600 rounded text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Icons.Trash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Form Modal */}
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        <div className="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl">
                            <div className="border-b border-slate-700 p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white">
                                        {editingModel ? 'Edit Weigher Model' : 'Add Weigher Model'}
                                    </h3>
                                    <button
                                        onClick={handleCloseForm}
                                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <Icons.X size={20} className="text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Model Code <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="PBW4-4"
                                    />
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Model Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Precision Belt Weigher 4-cell, 4-idler"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Load Cells */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Load Cells <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="1"
                                            value={formData.loadCells}
                                            onChange={(e) => setFormData(prev => ({ ...prev, loadCells: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>

                                    {/* Idler Frames */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Idler Frames <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="1"
                                            value={formData.idlerFrames}
                                            onChange={(e) => setFormData(prev => ({ ...prev, idlerFrames: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        rows="2"
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Four load cell, four idler frame compatible"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saving ? 'Saving...' : (editingModel ? 'Update' : 'Add')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
