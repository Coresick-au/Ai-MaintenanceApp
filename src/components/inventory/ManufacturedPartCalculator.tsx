import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateManufacturedEstimate } from '../../services/costingService';
import { generateConfigSKU } from '../../utils/skuGenerator';
import { Icons } from '../../constants/icons';

interface ManufacturedPartCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
}

interface DesignTemplate {
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

export const ManufacturedPartCalculator = ({ isOpen, onClose }: ManufacturedPartCalculatorProps) => {
    const [step, setStep] = useState<'configure' | 'results'>('configure');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [margin, setMargin] = useState<number>(30); // Default 30% margin

    // Template data
    const [templates, setTemplates] = useState<DesignTemplate[]>([]);

    // Configuration
    const [formData, setFormData] = useState({
        type: '',
        width: 1200,
        material: 'MS',
        designTemplateId: '',
        loadingKgM: 50,
        quantity: 1,
        design: ''
    });

    // Calculation result
    const [estimate, setEstimate] = useState<any>(null);
    const [generatedSKU, setGeneratedSKU] = useState('');

    // Load design templates
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'manufactured_templates'));
                const templateList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as DesignTemplate));
                setTemplates(templateList);

                // Set first template as default
                if (templateList.length > 0 && !formData.designTemplateId) {
                    const firstTemplate = templateList[0];
                    setFormData(prev => ({
                        ...prev,
                        designTemplateId: firstTemplate.id,
                        type: firstTemplate.type || '',
                        design: firstTemplate.name || ''
                    }));
                }
            } catch (err) {
                console.error('Error loading templates:', err);
                setError('Failed to load design templates');
            }
        };

        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    // Auto-generate SKU when configuration changes
    useEffect(() => {
        if (formData.type && formData.width && formData.material && formData.design) {
            try {
                const sku = generateConfigSKU({
                    type: formData.type,
                    width: formData.width,
                    material: formData.material,
                    design: formData.design
                });
                setGeneratedSKU(sku);
            } catch (err) {
                console.error('SKU generation error:', err);
            }
        }
    }, [formData.type, formData.width, formData.material, formData.design]);

    const handleTemplateChange = async (templateId: string) => {
        try {
            const templateDoc = await getDoc(doc(db, 'manufactured_templates', templateId));
            if (templateDoc.exists()) {
                const templateData = templateDoc.data() as DesignTemplate;
                setFormData(prev => ({
                    ...prev,
                    designTemplateId: templateId,
                    type: templateData.type || prev.type,
                    design: templateData.name || prev.design
                }));
            }
        } catch (err) {
            console.error('Error loading template:', err);
        }
    };

    const handleCalculate = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await calculateManufacturedEstimate(formData);
            setEstimate(result);
            setStep('results');
        } catch (err: any) {
            setError(err.message || 'Failed to calculate estimate');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('configure');
        setEstimate(null);
        setError('');
        setMargin(30);
        setFormData({
            type: '',
            width: 1200,
            material: 'MS',
            designTemplateId: '',
            loadingKgM: 50,
            quantity: 1,
            design: ''
        });
        onClose();
    };

    const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    // Calculate sale price with margin
    const calculateSalePrice = (costCents: number, marginPercent: number) => {
        return Math.round(costCents / (1 - marginPercent / 100));
    };

    const selectedTemplate = templates.find(t => t.id === formData.designTemplateId);
    const availableWidths = selectedTemplate?.pricingMatrix?.map(pm => pm.width) || [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 w-full max-w-3xl rounded-xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-slate-700 p-6 pb-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">
                            Manufactured Part Cost Calculator
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icons.X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="mt-4 flex items-center gap-2">
                        <div className={`flex-1 h-2 rounded ${step === 'configure' ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
                        <div className={`flex-1 h-2 rounded ${step === 'results' ? 'bg-purple-500' : 'bg-slate-700'}`}></div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                        <span className={step === 'configure' ? 'text-purple-400 font-medium' : ''}>Configure</span>
                        <span className={step === 'results' ? 'text-purple-400 font-medium' : ''}>Results</span>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Configuration Step */}
                {step === 'configure' && (
                    <div className="p-6 space-y-4">
                        {/* Design Template Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Design Template <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.designTemplateId}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">-- Select Template --</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name} ({template.type})
                                    </option>
                                ))}
                            </select>
                            {selectedTemplate?.description && (
                                <p className="text-xs text-slate-400 mt-1">{selectedTemplate.description}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Part Type <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g., BW, IDL"
                                />
                            </div>

                            {/* Width */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Width (mm) <span className="text-red-400">*</span>
                                </label>
                                {availableWidths.length > 0 ? (
                                    <select
                                        value={formData.width}
                                        onChange={(e) => setFormData(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        {availableWidths.map(width => (
                                            <option key={width} value={width}>{width}mm</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        value={formData.width}
                                        onChange={(e) => setFormData(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="1200"
                                    />
                                )}
                            </div>

                            {/* Material */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Material <span className="text-red-400">*</span>
                                </label>
                                <select
                                    value={formData.material}
                                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="MS">Mild Steel (MS)</option>
                                    <option value="SS">Stainless Steel (SS)</option>
                                </select>
                            </div>

                            {/* Loading Capacity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Loading (kg/m)
                                </label>
                                <input
                                    type="number"
                                    value={formData.loadingKgM}
                                    onChange={(e) => setFormData(prev => ({ ...prev, loadingKgM: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="50"
                                />
                            </div>
                        </div>

                        {/* Quantity (for Idler Frame) */}
                        {formData.type.toLowerCase().includes('idler frame') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    <Icons.Info size={12} className="inline mr-1" />
                                    Quantity affects setup fee calculation
                                </p>
                            </div>
                        )}

                        {/* Design Specification */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Design Specification
                            </label>
                            <input
                                type="text"
                                value={formData.design}
                                onChange={(e) => setFormData(prev => ({ ...prev, design: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., 50x100, STANDARD"
                            />
                        </div>

                        {/* Generated SKU Preview */}
                        {generatedSKU && (
                            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300">Generated SKU:</span>
                                    <span className="text-lg font-mono font-bold text-purple-400">{generatedSKU}</span>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCalculate}
                                disabled={loading || !formData.designTemplateId}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Icons.Loader size={18} className="animate-spin" />
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Calculator size={18} />
                                        Calculate Cost & Price
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Results Step */}
                {step === 'results' && estimate && (
                    <div className="p-6 space-y-4">
                        {/* Configuration Summary */}
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                                <h3 className="font-semibold text-white text-lg">Configuration</h3>
                                <button
                                    onClick={() => setStep('configure')}
                                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                >
                                    <Icons.Edit size={14} /> Edit
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-400">SKU:</span>
                                    <span className="ml-2 text-white font-mono">{generatedSKU}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Type:</span>
                                    <span className="ml-2 text-white">{estimate.type}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Width:</span>
                                    <span className="ml-2 text-white">{estimate.width}mm</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Material:</span>
                                    <span className="ml-2 text-white">{estimate.material}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                            <h3 className="font-semibold text-white text-lg mb-3">Cost Breakdown</h3>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                    <span className="text-slate-300">Fabricator Cost:</span>
                                    <span className="font-mono text-white">{formatMoney(estimate.fabricatorCost)}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                    <span className="text-slate-300">Internal Parts & BOM:</span>
                                    <span className="font-mono text-white">{formatMoney(estimate.internalPartCost)}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                    <span className="text-slate-300">Labor Cost:</span>
                                    <span className="font-mono text-white">{formatMoney(estimate.laborCost)}</span>
                                </div>
                            </div>

                            <div className="h-px bg-slate-700 my-3"></div>

                            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                                <span className="font-bold text-white text-lg">Total Cost:</span>
                                <span className="text-2xl font-bold text-emerald-400">{formatMoney(estimate.totalEstimate)}</span>
                            </div>
                        </div>

                        {/* Sale Price Calculator */}
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                            <h3 className="font-semibold text-white text-lg mb-3">Sale Price Calculator</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Target Margin (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={margin}
                                    onChange={(e) => setMargin(parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                {[20, 25, 30, 35, 40].map(marginValue => {
                                    const salePrice = calculateSalePrice(estimate.totalEstimate, marginValue);
                                    return (
                                        <div key={marginValue} className="flex items-center justify-between p-2 hover:bg-slate-700/50 rounded transition-colors">
                                            <span className="text-slate-300">{marginValue}% margin:</span>
                                            <span className="font-mono text-white">{formatMoney(salePrice)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="h-px bg-slate-700 my-3"></div>

                            <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                <span className="font-bold text-white text-lg">Sale Price @ {margin}%:</span>
                                <span className="text-2xl font-bold text-purple-400">
                                    {formatMoney(calculateSalePrice(estimate.totalEstimate, margin))}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-4 border-t border-slate-700">
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
