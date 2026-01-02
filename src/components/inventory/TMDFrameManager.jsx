import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import {
    addTMDFrame,
    updateTMDFrame,
    deleteTMDFrame,
    importTMDFrames,
    STANDARD_BELT_WIDTHS,
    formatCurrency,
    filterSuppliersByCategories
} from '../../services/specializedComponentsService';
import { exportToCSV, importFromCSV } from '../../utils/csvExportImport';
import { CategorySelect } from './categories/CategorySelect';
import { CategoryProvider } from '../../context/CategoryContext';
import { useCategories } from '../../context/CategoryContext';
import { useResizableColumns } from '../../hooks/useResizableColumns';

export const TMDFrameManager = () => {
    const [tmdFrames, setTMDFrames] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFrame, setEditingFrame] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [sortField, setSortField] = useState('effectiveDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const { categories } = useCategories();
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        beltWidth: 1200,
        quantity: 1,
        categoryId: null,
        subcategoryId: null,
        suppliers: [],
        costPrice: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const tableRef = useRef(null);
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([120, 80, 150, 150, 100, 120, 120, 100]);

    // Load TMD Frames from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'tmd_frames_cost_history'),
            (snapshot) => {
                const framesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                framesList.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
                setTMDFrames(framesList);
            },
            (error) => {
                console.error('Error loading TMD Frames:', error);
                setError('Failed to load TMD Frames');
            }
        );

        return () => unsubscribe();
    }, []);

    // Load suppliers from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'suppliers'), (snap) => {
            const suppliersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            suppliersList.sort((a, b) => a.name.localeCompare(b.name));
            setSuppliers(suppliersList);
        });

        return () => unsubscribe();
    }, []);

    // Filter suppliers by component's categories
    useEffect(() => {
        const categoryIds = [];
        if (formData.categoryId) categoryIds.push(formData.categoryId);
        if (formData.subcategoryId) categoryIds.push(formData.subcategoryId);

        const filtered = filterSuppliersByCategories(suppliers, categoryIds);
        setFilteredSuppliers(filtered);
    }, [suppliers, formData.categoryId, formData.subcategoryId]);

    const handleAddSupplier = () => {
        if (!selectedSupplier) return;

        const currentSuppliers = formData.suppliers || [];
        if (currentSuppliers.includes(selectedSupplier)) {
            setError(`"${selectedSupplier}" is already added`);
            setTimeout(() => setError(''), 3000);
            return;
        }

        setFormData(prev => ({
            ...prev,
            suppliers: [...(prev.suppliers || []), selectedSupplier]
        }));
        setSelectedSupplier('');
        setError('');
    };

    const handleRemoveSupplier = (supplierToRemove) => {
        setFormData(prev => ({
            ...prev,
            suppliers: (prev.suppliers || []).filter(s => s !== supplierToRemove)
        }));
    };

    const handleOpenForm = (frame = null) => {
        if (frame) {
            setEditingFrame(frame);
            setFormData({
                beltWidth: frame.beltWidth,
                quantity: frame.quantity,
                categoryId: frame.categoryId || null,
                subcategoryId: frame.subcategoryId || null,
                suppliers: frame.suppliers || [],
                costPrice: (frame.costPrice / 100).toFixed(2),
                effectiveDate: frame.effectiveDate,
                notes: frame.notes || ''
            });
        } else {
            setEditingFrame(null);
            setFormData({
                beltWidth: 1200,
                quantity: 1,
                categoryId: null,
                subcategoryId: null,
                suppliers: [],
                costPrice: '',
                effectiveDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
        }
        setIsFormOpen(true);
        setError('');
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingFrame(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const costPriceCents = Math.round(parseFloat(formData.costPrice) * 100);

            const frameData = {
                beltWidth: parseInt(formData.beltWidth),
                quantity: parseInt(formData.quantity),
                categoryId: formData.categoryId,
                subcategoryId: formData.subcategoryId,
                suppliers: formData.suppliers || [],
                supplierName: (formData.suppliers && formData.suppliers.length > 0) ? formData.suppliers[0] : null,
                costPrice: costPriceCents,
                effectiveDate: formData.effectiveDate,
                notes: formData.notes.trim()
            };

            if (editingFrame) {
                await updateTMDFrame(editingFrame.id, frameData);
            } else {
                await addTMDFrame(frameData);
            }

            handleCloseForm();
        } catch (err) {
            setError(err.message || 'Failed to save TMD Frame');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (frameId) => {
        if (!confirm('Are you sure you want to delete this TMD Frame entry?')) return;

        try {
            await deleteTMDFrame(frameId);
        } catch (err) {
            setError(err.message || 'Failed to delete TMD Frame');
        }
    };

    const handleExport = () => {
        try {
            if (tmdFrames.length === 0) {
                setError('No data to export');
                return;
            }

            const filename = `tmd_frames_history_${new Date().toISOString().split('T')[0]}.csv`;
            exportToCSV(tmdFrames, filename);
            setSuccessMessage(`Exported ${tmdFrames.length} records successfully`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to export data');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setError('');
            setSuccessMessage('Importing data...');

            const data = await importFromCSV(file);
            const results = await importTMDFrames(data);

            let message = `Import complete: ${results.success} added`;
            if (results.skipped > 0) message += `, ${results.skipped} skipped (duplicates)`;
            if (results.failed > 0) message += `, ${results.failed} failed`;

            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 5000);

            if (results.errors.length > 0) {
                console.warn('Import errors:', results.errors);
            }
        } catch (err) {
            setError(err.message || 'Failed to import data');
            setSuccessMessage('');
        } finally {
            e.target.value = '';
        }
    };

    const getCategoryName = (categoryId) => {
        if (!categoryId) return null;
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : null;
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortedFrames = () => {
        const sorted = [...tmdFrames].sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case 'beltWidth':
                case 'quantity':
                case 'costPrice':
                    aVal = a[sortField];
                    bVal = b[sortField];
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                case 'totalCost':
                    aVal = a.costPrice * a.quantity;
                    bVal = b.costPrice * b.quantity;
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                case 'effectiveDate':
                    aVal = new Date(a.effectiveDate);
                    bVal = new Date(b.effectiveDate);
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                case 'suppliers':
                    aVal = a.suppliers && a.suppliers.length > 0 ? a.suppliers[0] : '';
                    bVal = b.suppliers && b.suppliers.length > 0 ? b.suppliers[0] : '';
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                default:
                    return 0;
            }
        });
        return sorted;
    };

    const SortableHeader = ({ field, children, index }) => (
        <th
            className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:bg-slate-700/50 transition-colors relative"
            onClick={() => handleSort(field)}
            style={{ width: `${columnWidths[index]}px` }}
        >
            <div className="flex items-center gap-1 column-content">
                {children}
                {sortField === field && (
                    sortDirection === 'asc' ?
                        <Icons.ChevronUp size={14} /> :
                        <Icons.ChevronDown size={14} />
                )}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors"
                onMouseDown={(e) => handleResizeStart(index, e)}
                onDoubleClick={() => autoFitColumn(index, tableRef)}
                onClick={(e) => e.stopPropagation()}
                title="Drag to resize, double-click to auto-fit"
            />
        </th>
    );

    return (
        <CategoryProvider>
            <div className="flex flex-col h-full items-center">
                <div className="w-full max-w-fit space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white">TMD Frames</h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400">
                                    {tmdFrames.length} Total
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 mt-1">
                                Track historical cost data for Tramp Metal Detector frames
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExport}
                                disabled={tmdFrames.length === 0}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Export to CSV"
                            >
                                <Icons.Download size={20} />
                                Export CSV
                            </button>
                            <button
                                onClick={handleImportClick}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                title="Import from CSV"
                            >
                                <Icons.Upload size={20} />
                                Import CSV
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => handleOpenForm()}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Icons.Plus size={20} />
                                Add TMD Frame
                            </button>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                            {successMessage}
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                                <thead className="bg-slate-800 border-b border-slate-700">
                                    <tr>
                                        <SortableHeader field="beltWidth" index={0}>Belt Width</SortableHeader>
                                        <SortableHeader field="quantity" index={1}>Qty</SortableHeader>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[2]}px` }}>
                                            <div className="column-content">Category</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[3]}px` }}>
                                            <div className="column-content">Suppliers</div>
                                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(3, e)} onDoubleClick={() => autoFitColumn(3, tableRef)} onClick={(e) => e.stopPropagation()} />
                                        </th>
                                        <SortableHeader field="costPrice" index={4}>Cost/Unit</SortableHeader>
                                        <SortableHeader field="totalCost" index={5}>Total Cost</SortableHeader>
                                        <SortableHeader field="effectiveDate" index={6}>Effective Date</SortableHeader>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[7]}px` }}>
                                            <div className="column-content">Actions</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {getSortedFrames().length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                                                No TMD Frames added yet. Click "Add TMD Frame" to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        getSortedFrames().map(frame => (
                                            <tr key={frame.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-white">{frame.beltWidth}mm</td>
                                                <td className="px-4 py-3 text-sm text-slate-300">{frame.quantity}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {getCategoryName(frame.categoryId) || getCategoryName(frame.subcategoryId) ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {getCategoryName(frame.categoryId) && (
                                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs">
                                                                    {getCategoryName(frame.categoryId)}
                                                                </span>
                                                            )}
                                                            {getCategoryName(frame.subcategoryId) && (
                                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-xs">
                                                                    {getCategoryName(frame.subcategoryId)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {frame.suppliers && frame.suppliers.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {frame.suppliers.map((supplier, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-xs">
                                                                    {supplier}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-emerald-400">{formatCurrency(frame.costPrice)}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-cyan-400">{formatCurrency(frame.costPrice * frame.quantity)}</td>
                                                <td className="px-4 py-3 text-sm text-slate-300">{frame.effectiveDate}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenForm(frame)}
                                                            className="p-1.5 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Icons.Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(frame.id)}
                                                            className="p-1.5 hover:bg-slate-700 rounded text-red-400 transition-colors"
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
                            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                                <div className="border-b border-slate-700 p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-white">
                                            {editingFrame ? 'Edit TMD Frame' : 'Add TMD Frame'}
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
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Belt Width */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                                Belt Width (mm) <span className="text-red-400">*</span>
                                            </label>
                                            <select
                                                required
                                                value={formData.beltWidth}
                                                onChange={(e) => setFormData(prev => ({ ...prev, beltWidth: e.target.value }))}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            >
                                                {STANDARD_BELT_WIDTHS.map(width => (
                                                    <option key={width} value={width}>{width}mm</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Quantity */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                                Quantity <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                placeholder="1"
                                            />
                                        </div>
                                    </div>

                                    {/* Cost Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Cost Per Unit ($) <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    {/* Category Selection */}
                                    <CategorySelect
                                        value={{ categoryId: formData.categoryId, subcategoryId: formData.subcategoryId }}
                                        onChange={(selection) => setFormData(prev => ({
                                            ...prev,
                                            categoryId: selection.categoryId,
                                            subcategoryId: selection.subcategoryId
                                        }))}
                                        required={false}
                                    />

                                    {/* Suppliers */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Suppliers
                                        </label>
                                        <div className="space-y-3">
                                            {/* Add Supplier */}
                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedSupplier}
                                                    onChange={(e) => setSelectedSupplier(e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                >
                                                    <option value="">-- Select Supplier --</option>
                                                    {filteredSuppliers.map(supplier => (
                                                        <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={handleAddSupplier}
                                                    disabled={!selectedSupplier}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    <Icons.Plus size={16} />
                                                    Add
                                                </button>
                                            </div>

                                            {/* Supplier List */}
                                            {formData.suppliers?.length > 0 && (
                                                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                                    <p className="text-xs text-slate-400 mb-2">Added Suppliers:</p>
                                                    <div className="space-y-1">
                                                        {formData.suppliers.map((supplier, index) => (
                                                            <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                                                <span className="text-sm text-white">{supplier}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSupplier(supplier)}
                                                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                                    title="Remove supplier"
                                                                >
                                                                    <Icons.X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Effective Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Effective Date <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.effectiveDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Notes
                                        </label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                            rows="3"
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="Optional notes..."
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
                                            {saving ? 'Saving...' : (editingFrame ? 'Update' : 'Add')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CategoryProvider>
    );
};
