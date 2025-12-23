import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { calculateManufacturedEstimate } from '../../services/costingService';

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTemplate: any | null;
}

interface PricingMatrixEntry {
    width: number;
    price: number;
}

interface BOMItem {
    type: 'part' | 'fastener';
    id: string;
    name: string;
    quantity: number;
}

export const TemplateModal = ({ isOpen, onClose, editingTemplate }: TemplateModalProps) => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'bom' | 'labor' | 'test'>('basic');

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        description: '',
        pricingType: 'matrix' as 'matrix' | 'fixed',
        basePrice: '',
        setupFee: '',
        laborMinutes: '',
        materialMultiplierMS: '1.0',
        materialMultiplierSS: '1.5'
    });

    // Pricing matrix
    const [pricingMatrix, setPricingMatrix] = useState<PricingMatrixEntry[]>([
        { width: 600, price: 0 }
    ]);

    // BOM items
    const [bomItems, setBomItems] = useState<BOMItem[]>([]);

    // Available parts and fasteners
    const [availableParts, setAvailableParts] = useState<any[]>([]);
    const [availableFasteners, setAvailableFasteners] = useState<any[]>([]);

    // Test calculator
    const [testWidth, setTestWidth] = useState(1200);
    const [testMaterial, setTestMaterial] = useState('MS');
    const [testQuantity, setTestQuantity] = useState(1);
    const [testResult, setTestResult] = useState<any>(null);
    const [testLoading, setTestLoading] = useState(false);

    // Load parts and fasteners
    useEffect(() => {
        const loadCatalogs = async () => {
            try {
                const [partsSnap, fastenersSnap] = await Promise.all([
                    getDocs(collection(db, 'part_catalog')),
                    getDocs(collection(db, 'fastener_catalog'))
                ]);

                setAvailableParts(partsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setAvailableFasteners(fastenersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error('Error loading catalogs:', err);
            }
        };

        if (isOpen) {
            loadCatalogs();
        }
    }, [isOpen]);

    // Load template data when editing
    useEffect(() => {
        if (editingTemplate) {
            setFormData({
                name: editingTemplate.name || '',
                type: editingTemplate.type || '',
                description: editingTemplate.description || '',
                pricingType: editingTemplate.basePrice ? 'fixed' : 'matrix',
                basePrice: editingTemplate.basePrice ? (editingTemplate.basePrice / 100).toFixed(2) : '',
                setupFee: editingTemplate.setupFee ? (editingTemplate.setupFee / 100).toFixed(2) : '',
                laborMinutes: editingTemplate.laborMinutes?.toString() || '',
                materialMultiplierMS: editingTemplate.materialMultiplier?.MS?.toString() || '1.0',
                materialMultiplierSS: editingTemplate.materialMultiplier?.SS?.toString() || '1.5'
            });

            if (editingTemplate.pricingMatrix) {
                setPricingMatrix(editingTemplate.pricingMatrix.map((pm: any) => ({
                    width: pm.width,
                    price: pm.price / 100
                })));
            }

            if (editingTemplate.internalBOM) {
                const loadedBOM: BOMItem[] = [];
                editingTemplate.internalBOM.forEach((item: any) => {
                    loadedBOM.push({
                        type: item.type,
                        id: item.partId || item.fastenerId || item.id,
                        name: '',  // Will be populated from catalog
                        quantity: item.quantity || item.quantityUsed || 1
                    });
                });
                setBomItems(loadedBOM);
            }
        } else {
            // Reset for new template
            setFormData({
                name: '',
                type: '',
                description: '',
                pricingType: 'matrix',
                basePrice: '',
                setupFee: '',
                laborMinutes: '',
                materialMultiplierMS: '1.0',
                materialMultiplierSS: '1.5'
            });
            setPricingMatrix([{ width: 600, price: 0 }]);
            setBomItems([]);
        }
        setActiveTab('basic');
        setError('');
    }, [editingTemplate, isOpen]);

    const handleAddPricingRow = () => {
        const lastWidth = pricingMatrix.length > 0 ? pricingMatrix[pricingMatrix.length - 1].width : 0;
        setPricingMatrix([...pricingMatrix, { width: lastWidth + 600, price: 0 }]);
    };

    const handleRemovePricingRow = (index: number) => {
        setPricingMatrix(pricingMatrix.filter((_, i) => i !== index));
    };

    const handlePricingChange = (index: number, field: 'width' | 'price', value: string) => {
        const newMatrix = [...pricingMatrix];
        newMatrix[index][field] = parseFloat(value) || 0;
        setPricingMatrix(newMatrix);
    };

    const handleAddBOMItem = (type: 'part' | 'fastener', itemId: string) => {
        const catalog = type === 'part' ? availableParts : availableFasteners;
        const item = catalog.find(i => i.id === itemId);

        if (!item) return;

        // Check if already added
        if (bomItems.some(b => b.id === itemId)) {
            setError(`${item.name} is already in the BOM`);
            setTimeout(() => setError(''), 3000);
            return;
        }

        setBomItems([...bomItems, {
            type,
            id: itemId,
            name: item.name,
            quantity: 1
        }]);
    };

    const handleRemoveBOMItem = (id: string) => {
        setBomItems(bomItems.filter(item => item.id !== id));
    };

    const handleBOMQuantityChange = (id: string, quantity: number) => {
        setBomItems(bomItems.map(item =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
        ));
    };

    const handleTestCalculator = async () => {
        if (!editingTemplate) {
            setError('Save the template first before testing');
            return;
        }

        setTestLoading(true);
        setTestResult(null);

        try {
            const result = await calculateManufacturedEstimate({
                type: formData.type,
                width: testWidth,
                material: testMaterial,
                designTemplateId: editingTemplate.id,
                loadingKgM: 50,
                quantity: testQuantity
            });
            setTestResult(result);
        } catch (err: any) {
            setError(err.message || 'Test calculation failed');
        } finally {
            setTestLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            // Validate
            if (!formData.name.trim() || !formData.type.trim()) {
                throw new Error('Name and Type are required');
            }

            if (formData.pricingType === 'matrix' && pricingMatrix.length === 0) {
                throw new Error('Add at least one pricing matrix entry');
            }

            // Build template object
            const templateData: any = {
                name: formData.name.trim(),
                type: formData.type.trim(),
                description: formData.description.trim(),
                laborMinutes: parseInt(formData.laborMinutes) || 0,
                materialMultiplier: {
                    MS: parseFloat(formData.materialMultiplierMS) || 1.0,
                    SS: parseFloat(formData.materialMultiplierSS) || 1.5
                }
            };

            // Add pricing
            if (formData.pricingType === 'fixed') {
                templateData.basePrice = Math.round(parseFloat(formData.basePrice || '0') * 100);
                templateData.setupFee = Math.round(parseFloat(formData.setupFee || '0') * 100);
            } else {
                templateData.pricingMatrix = pricingMatrix.map(pm => ({
                    width: pm.width,
                    price: Math.round(pm.price * 100)
                })).sort((a, b) => a.width - b.width);
                templateData.setupFee = Math.round(parseFloat(formData.setupFee || '0') * 100);
            }

            // Add BOM
            templateData.internalBOM = bomItems.map(item => ({
                type: item.type,
                [item.type === 'part' ? 'partId' : 'fastenerId']: item.id,
                quantity: item.quantity
            }));

            // Save to Firestore
            if (editingTemplate) {
                await updateDoc(doc(db, 'manufactured_templates', editingTemplate.id), templateData);
            } else {
                const newId = `template-${Date.now()}`;
                await setDoc(doc(db, 'manufactured_templates', newId), templateData);
            }

            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-5xl rounded-xl border border-slate-700 shadow-2xl my-8">
                {/* Header */}
                <div className="border-b border-slate-700 p-6 pb-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">
                            {editingTemplate ? 'Edit Template' : 'New Template'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icons.X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { key: 'basic', label: 'Basic Info', icon: Icons.FileText },
                            { key: 'pricing', label: 'Pricing', icon: Icons.Calculator },
                            { key: 'bom', label: 'BOM', icon: Icons.Package },
                            { key: 'labor', label: 'Labor & Materials', icon: Icons.Clock },
                            { key: 'test', label: 'Test', icon: Icons.Zap }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === tab.key
                                    ? 'bg-purple-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Template Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="50x100 Belt Weigher"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Part Type <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="BW, IDL, Idler Frame, etc."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Optional description of this template..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Pricing Tab */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Pricing Type
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.pricingType === 'matrix'}
                                            onChange={() => setFormData(prev => ({ ...prev, pricingType: 'matrix' }))}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-white">Pricing Matrix (by width)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.pricingType === 'fixed'}
                                            onChange={() => setFormData(prev => ({ ...prev, pricingType: 'fixed' }))}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-white">Price per KG (for billets)</span>
                                    </label>
                                </div>
                            </div>

                            {formData.pricingType === 'matrix' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-300">Width-Based Pricing</label>
                                        <button
                                            type="button"
                                            onClick={handleAddPricingRow}
                                            className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded flex items-center gap-1"
                                        >
                                            <Icons.Plus size={14} /> Add Width
                                        </button>
                                    </div>

                                    {/* Column Headers */}
                                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-2">
                                        <div className="text-xs font-medium text-slate-400">Width (mm)</div>
                                        <div className="text-xs font-medium text-slate-400">Price ($)</div>
                                        <div className="w-8"></div>
                                    </div>

                                    <div className="space-y-2">
                                        {pricingMatrix.map((entry, index) => (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                                <div>
                                                    <input
                                                        type="number"
                                                        value={entry.width}
                                                        onChange={(e) => handlePricingChange(index, 'width', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        placeholder="Width"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={entry.price}
                                                        onChange={(e) => handlePricingChange(index, 'price', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        placeholder="Price"
                                                    />
                                                </div>
                                                {pricingMatrix.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePricingRow(index)}
                                                        className="p-2 hover:bg-red-500/20 rounded text-red-400"
                                                    >
                                                        <Icons.Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Setup Fee - Applies to all widths */}
                                    <div className="pt-3 border-t border-slate-700">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Setup Fee (applies to all widths)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.setupFee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, setupFee: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="One-time setup fee"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Price per KG ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.basePrice}
                                            onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            placeholder="Price per kilogram"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Setup Fee ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.setupFee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, setupFee: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOM Tab */}
                    {activeTab === 'bom' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Add Part
                                    </label>
                                    <select
                                        onChange={(e) => { handleAddBOMItem('part', e.target.value); e.target.value = ''; }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">-- Select Part --</option>
                                        {availableParts.map(part => (
                                            <option key={part.id} value={part.id}>{part.name} ({part.sku})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Add Fastener
                                    </label>
                                    <select
                                        onChange={(e) => { handleAddBOMItem('fastener', e.target.value); e.target.value = ''; }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">-- Select Fastener --</option>
                                        {availableFasteners.map(fastener => (
                                            <option key={fastener.id} value={fastener.id}>{fastener.name} ({fastener.sku})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    BOM Items ({bomItems.length})
                                </label>
                                {bomItems.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <Icons.Package size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">No items in BOM yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {bomItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                                                <div className="flex-1">
                                                    <div className="text-white">{item.name || item.id}</div>
                                                    <div className="text-xs text-slate-400">{item.type}</div>
                                                </div>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleBOMQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                                    className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveBOMItem(item.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded text-red-400"
                                                >
                                                    <Icons.Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Labor & Materials Tab */}
                    {activeTab === 'labor' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Labor Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={formData.laborMinutes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, laborMinutes: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="120"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Mild Steel (MS) Multiplier
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.materialMultiplierMS}
                                        onChange={(e) => setFormData(prev => ({ ...prev, materialMultiplierMS: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Stainless Steel (SS) Multiplier
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.materialMultiplierSS}
                                        onChange={(e) => setFormData(prev => ({ ...prev, materialMultiplierSS: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                                <p className="text-sm text-slate-300">
                                    <Icons.Info size={16} className="inline mr-2" />
                                    Material multipliers are applied to the fabricator cost. A value of 1.0 means no change, 1.5 means 50% increase for that material.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Test Calculator Tab */}
                    {activeTab === 'test' && (
                        <div className="space-y-4">
                            {!editingTemplate ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Icons.Info size={48} className="mx-auto mb-3 opacity-30" />
                                    <p>Save the template first to test calculations</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Width (mm)
                                            </label>
                                            <input
                                                type="number"
                                                value={testWidth}
                                                onChange={(e) => setTestWidth(parseInt(e.target.value) || 0)}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Material
                                            </label>
                                            <select
                                                value={testMaterial}
                                                onChange={(e) => setTestMaterial(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="MS">Mild Steel (MS)</option>
                                                <option value="SS">Stainless Steel (SS)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={testQuantity}
                                                onChange={(e) => setTestQuantity(parseInt(e.target.value) || 1)}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleTestCalculator}
                                        disabled={testLoading}
                                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {testLoading ? (
                                            <>
                                                <Icons.Loader size={18} className="animate-spin" />
                                                Calculating...
                                            </>
                                        ) : (
                                            <>
                                                <Icons.Zap size={18} />
                                                Run Test Calculation
                                            </>
                                        )}
                                    </button>

                                    {testResult && (
                                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
                                            <h4 className="font-semibold text-white">Test Results</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Fabricator Cost:</span>
                                                    <span className="text-white font-mono">{formatMoney(testResult.fabricatorCost)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Internal Parts:</span>
                                                    <span className="text-white font-mono">{formatMoney(testResult.internalPartCost)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Labor:</span>
                                                    <span className="text-white font-mono">{formatMoney(testResult.laborCost)}</span>
                                                </div>
                                                <div className="h-px bg-slate-700"></div>
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-white font-semibold">Total:</span>
                                                    <span className="text-cyan-400 font-bold">{formatMoney(testResult.totalEstimate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-700 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Icons.Loader size={18} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Icons.Save size={18} />
                                    {editingTemplate ? 'Update Template' : 'Create Template'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
