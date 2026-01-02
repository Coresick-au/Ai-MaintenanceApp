import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import {
    addWeighModule,
    updateWeighModule,
    deleteWeighModule,
    importWeighModules,
    getAllWeigherModels,
    MATERIAL_TYPES,
    STANDARD_BELT_WIDTHS,
    IDLER_SPACING_OPTIONS,
    formatCurrency,
    filterSuppliersByCategories
} from '../../services/specializedComponentsService';
import { exportToCSV, importFromCSV } from '../../utils/csvExportImport';
import { CategorySelect } from './categories/CategorySelect';
import { CategoryProvider } from '../../context/CategoryContext';
import { useCategories } from '../../context/CategoryContext';

export const WeighModuleManager = () => {
    const [weighModules, setWeighModules] = useState([]);
    const [weigherModels, setWeigherModels] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
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
        modelId: '',
        beltWidth: 1200,
        materialType: 'STAINLESS_STEEL',
        capacityKgPerM: 0,
        idlerSpacing: 1000,
        categoryId: null,
        subcategoryId: null,
        suppliers: [],
        costPrice: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: '',
        excludeFromCount: false
    });

    // Load weigh modules from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'weigh_modules_cost_history'),
            (snapshot) => {
                const modules = snapshot.docs.map(doc => doc.data());
                modules.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
                setWeighModules(modules);
            },
            (error) => {
                console.error('Error loading weigh modules:', error);
                setError('Failed to load weigh modules');
            }
        );

        return () => unsubscribe();
    }, []);

    // Load weigher models
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'weigher_models'),
            (snapshot) => {
                const models = snapshot.docs.map(doc => doc.data());
                models.sort((a, b) => a.code.localeCompare(b.code));
                setWeigherModels(models);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load suppliers from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'suppliers'), (snap) => {
            const suppliersList = snap.docs.map(doc => doc.data());
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

    const handleOpenForm = (module = null) => {
        if (module) {
            setEditingModule(module);
            setFormData({
                modelId: module.modelId,
                beltWidth: module.beltWidth,
                materialType: module.materialType,
                capacityKgPerM: module.capacityKgPerM,
                idlerSpacing: module.idlerSpacing,
                categoryId: module.categoryId || null,
                subcategoryId: module.subcategoryId || null,
                suppliers: module.suppliers || [],
                costPrice: (module.costPrice / 100).toFixed(2),
                effectiveDate: module.effectiveDate,
                notes: module.notes || '',
                excludeFromCount: module.excludeFromCount || false
            });
        } else {
            setEditingModule(null);
            setFormData({
                modelId: '',
                beltWidth: 1200,
                materialType: 'STAINLESS_STEEL',
                capacityKgPerM: 0,
                idlerSpacing: 1000,
                categoryId: null,
                subcategoryId: null,
                suppliers: [],
                costPrice: '',
                effectiveDate: new Date().toISOString().split('T')[0],
                notes: '',
                excludeFromCount: false
            });
        }
        setIsFormOpen(true);
        setError('');
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingModule(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const costPriceCents = Math.round(parseFloat(formData.costPrice) * 100);

            const moduleData = {
                modelId: formData.modelId,
                beltWidth: parseInt(formData.beltWidth),
                materialType: formData.materialType,
                capacityKgPerM: parseFloat(formData.capacityKgPerM),
                idlerSpacing: parseInt(formData.idlerSpacing),
                categoryId: formData.categoryId,
                subcategoryId: formData.subcategoryId,
                suppliers: formData.suppliers || [],
                supplierName: (formData.suppliers && formData.suppliers.length > 0) ? formData.suppliers[0] : null,
                costPrice: costPriceCents,
                effectiveDate: formData.effectiveDate,
                notes: formData.notes.trim(),
                excludeFromCount: formData.excludeFromCount
            };

            if (editingModule) {
                await updateWeighModule(editingModule.id, moduleData);
            } else {
                await addWeighModule(moduleData);
            }

            handleCloseForm();
        } catch (err) {
            setError(err.message || 'Failed to save weigh module');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (moduleId) => {
        if (!confirm('Are you sure you want to delete this weigh module entry?')) return;

        try {
            await deleteWeighModule(moduleId);
        } catch (err) {
            setError(err.message || 'Failed to delete weigh module');
        }
    };

    const handleExport = () => {
        try {
            if (weighModules.length === 0) {
                setError('No data to export');
                return;
            }
            const filename = `weigh_modules_history_${new Date().toISOString().split('T')[0]}.csv`;
            exportToCSV(weighModules, filename);
            setSuccessMessage(`Exported ${weighModules.length} records successfully`);
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
            const results = await importWeighModules(data);
            let message = `Import complete: ${results.success} added`;
            if (results.skipped > 0) message += `, ${results.skipped} skipped (duplicates)`;
            if (results.failed > 0) message += `, ${results.failed} failed`;
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 5000);
            if (results.errors.length > 0) console.warn('Import errors:', results.errors);
        } catch (err) {
            setError(err.message || 'Failed to import data');
            setSuccessMessage('');
        } finally {
            e.target.value = '';
        }
    };

    const getModelName = (modelId) => {
        const model = weigherModels.find(m => m.id === modelId);
        return model ? `${model.code} - ${model.name}` : 'Unknown';
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

    const getSortedModules = () => {
        const sorted = [...weighModules].sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'model':
                    aVal = getModelName(a.modelId);
                    bVal = getModelName(b.modelId);
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case 'beltWidth':
                case 'capacityKgPerM':
                case 'idlerSpacing':
                case 'costPrice':
                    aVal = a[sortField];
                    bVal = b[sortField];
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                case 'materialType':
                    aVal = MATERIAL_TYPES[a.materialType];
                    bVal = MATERIAL_TYPES[b.materialType];
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case 'effectiveDate':
                    aVal = new Date(a.effectiveDate);
                    bVal = new Date(b.effectiveDate);
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                default:
                    return 0;
            }
        });
        return sorted;
    };

    const SortableHeader = ({ field, children }) => (
        <th
            className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase cursor-pointer hover:bg-slate-700/50 transition-colors"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortField === field && (
                    sortDirection === 'asc' ?
                        <Icons.ChevronUp size={14} /> :
                        <Icons.ChevronDown size={14} />
                )}
            </div>
        </th>
    );

    return (
        <CategoryProvider>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">Weigh Modules</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400">
                                {weighModules.filter(m => !m.excludeFromCount).length} Total
                            </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                            Track historical cost data for precision belt weighers
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            disabled={weighModules.length === 0}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icons.Download size={20} />
                            Export CSV
                        </button>
                        <button
                            onClick={handleImportClick}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
                            Add Weigh Module
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
                        <table className="w-full">
                            <thead className="bg-slate-800 border-b border-slate-700">
                                <tr>
                                    <SortableHeader field="model">Model</SortableHeader>
                                    <SortableHeader field="beltWidth">Belt Width</SortableHeader>
                                    <SortableHeader field="materialType">Material</SortableHeader>
                                    <SortableHeader field="capacityKgPerM">Capacity</SortableHeader>
                                    <SortableHeader field="idlerSpacing">Idler Spacing</SortableHeader>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Suppliers</th>
                                    <SortableHeader field="costPrice">Cost Price</SortableHeader>
                                    <SortableHeader field="effectiveDate">Effective Date</SortableHeader>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {getSortedModules().length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="px-4 py-8 text-center text-slate-400">
                                            No weigh modules added yet. Click "Add Weigh Module" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    getSortedModules().map(module => (
                                        <tr key={module.id} className={`hover:bg-slate-800/50 transition-colors ${module.excludeFromCount ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-3 text-sm text-white">
                                                {getModelName(module.modelId)}
                                                {module.excludeFromCount && (
                                                    <span className="ml-2 text-xs text-slate-500 italic">(Excluded)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{module.beltWidth}mm</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{MATERIAL_TYPES[module.materialType]}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{module.capacityKgPerM} kg/m</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{module.idlerSpacing}mm</td>
                                            <td className="px-4 py-3 text-sm">
                                                {getCategoryName(module.categoryId) || getCategoryName(module.subcategoryId) ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {getCategoryName(module.categoryId) && (
                                                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs">
                                                                {getCategoryName(module.categoryId)}
                                                            </span>
                                                        )}
                                                        {getCategoryName(module.subcategoryId) && (
                                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-xs">
                                                                {getCategoryName(module.subcategoryId)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {module.suppliers && module.suppliers.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {module.suppliers.map((supplier, idx) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-xs">
                                                                {supplier}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-emerald-400">{formatCurrency(module.costPrice)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{module.effectiveDate}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenForm(module)}
                                                        className="p-1.5 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(module.id)}
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
                                        {editingModule ? 'Edit Weigh Module' : 'Add Weigh Module'}
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
                                    {/* Weigher Model */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Weigher Model <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.modelId}
                                            onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="">-- Select Model --</option>
                                            {weigherModels.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.code} - {model.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

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
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Material Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Material Type <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.materialType}
                                            onChange={(e) => setFormData(prev => ({ ...prev, materialType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="STAINLESS_STEEL">{MATERIAL_TYPES.STAINLESS_STEEL}</option>
                                            <option value="GALVANISED">{MATERIAL_TYPES.GALVANISED}</option>
                                        </select>
                                    </div>

                                    {/* Capacity */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Capacity (kg/m) <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.1"
                                            value={formData.capacityKgPerM}
                                            onChange={(e) => setFormData(prev => ({ ...prev, capacityKgPerM: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            placeholder="150"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Idler Spacing */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Idler Spacing (mm) <span className="text-red-400">*</span>
                                        </label>
                                        <select
                                            required
                                            value={formData.idlerSpacing}
                                            onChange={(e) => setFormData(prev => ({ ...prev, idlerSpacing: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            {IDLER_SPACING_OPTIONS.map(spacing => (
                                                <option key={spacing} value={spacing}>{spacing}mm</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Cost Price */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">
                                            Cost Price ($) <span className="text-red-400">*</span>
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

                                {/* Exclude From Count */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="excludeFromCount"
                                        checked={formData.excludeFromCount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, excludeFromCount: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                                    />
                                    <label htmlFor="excludeFromCount" className="text-sm font-medium text-slate-300">
                                        Exclude from total count (Costing only)
                                    </label>
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
                                        {saving ? 'Saving...' : (editingModule ? 'Update' : 'Add')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </CategoryProvider>
    );
};
