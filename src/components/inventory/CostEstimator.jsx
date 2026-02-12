import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    MATERIAL_TYPES,
    STANDARD_BELT_WIDTHS,
    IDLER_SPACING_OPTIONS,
    TRANSOM_TYPES,
    ROLLER_DESIGNS,
    ROLLER_MATERIAL_TYPES,
    STANDARD_ROLLER_DIAMETERS,
    SPEED_SENSOR_DESIGNS,
    formatCurrency
} from '../../services/specializedComponentsService';
import {
    estimateWeighModuleCost,
    estimateIdlerFrameCost,
    estimateBilletWeightCost,
    estimateRollerCost,
    estimateSpeedSensorCost,
    estimateTMDFrameCost
} from '../../services/costEstimationService';
import { useResizableColumns } from '../../hooks/useResizableColumns';


// Matching Entries Table Component to handle its own resize state
const MatchingEntriesTable = ({ entries }) => {
    const tableRef = React.useRef(null);
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([120, 100, 120, 300]);

    return (
        <div className="bg-slate-800/50 rounded border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table ref={tableRef} className="text-left text-xs" style={{ tableLayout: 'auto' }}>
                    <thead className="bg-slate-800 border-b border-slate-700 font-medium text-slate-400">
                        <tr>
                            <th className="px-3 py-2 relative" style={{ width: `${columnWidths[0]}px` }}>
                                <div className="column-content">Cost/Unit</div>
                                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(0, e)} onDoubleClick={() => autoFitColumn(0, tableRef)} onClick={(e) => e.stopPropagation()} />
                            </th>
                            <th className="px-3 py-2 relative" style={{ width: `${columnWidths[1]}px` }}>
                                <div className="column-content">Date</div>
                                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(1, e)} onDoubleClick={() => autoFitColumn(1, tableRef)} onClick={(e) => e.stopPropagation()} />
                            </th>
                            <th className="px-3 py-2 relative" style={{ width: `${columnWidths[2]}px` }}>
                                <div className="column-content">Total</div>
                                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} />
                            </th>
                            <th className="px-3 py-2 relative" style={{ width: `${columnWidths[3]}px` }}>
                                <div className="column-content">Details</div>
                                <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(3, e)} onDoubleClick={() => autoFitColumn(3, tableRef)} onClick={(e) => e.stopPropagation()} />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/30">
                                <td className="px-3 py-2 font-mono text-emerald-400">
                                    {formatCurrency(entry.costPrice)}
                                </td>
                                <td className="px-3 py-2 text-slate-500">
                                    {entry.effectiveDate}
                                </td>
                                <td className="px-3 py-2 font-mono text-cyan-400">
                                    {entry.quantity && entry.quantity > 1 ? formatCurrency(entry.costPrice * entry.quantity) : '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-400 text-[10px]">
                                    {entry.beltWidth && `${entry.beltWidth}mm • `}
                                    {entry.capacity && `${entry.capacity} kg/m • `}
                                    {entry.weightKg && `${entry.weightKg}kg • `}
                                    {entry.diameter && `⌀${entry.diameter}mm • `}
                                    {entry.faceLength && `L${entry.faceLength}mm • `}
                                    {entry.rhsCutLength && `RHS L${entry.rhsCutLength}mm • `}
                                    {entry.quantity && `Qty: ${entry.quantity}`}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const CostEstimator = () => {
    const [componentType, setComponentType] = useState('weigh-module');
    const [dateRange, setDateRange] = useState(12);
    const [estimating, setEstimating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Weigher models for weigh module estimation
    const [weigherModels, setWeigherModels] = useState([]);

    // Form data for each component type
    const [weighModuleParams, setWeighModuleParams] = useState({
        modelId: '',
        beltWidth: 1200,
        materialType: 'STAINLESS_STEEL',
        capacityKgPerM: 150,
        idlerSpacing: 1000
    });

    const [idlerFrameParams, setIdlerFrameParams] = useState({
        beltWidth: 1200,
        materialType: 'STAINLESS_STEEL',
        capacityKgPerM: 150,
        quantity: 1,
        transomType: 'ANGLE',
        rollerDesign: 'THREE_ROLLER',
        hasCams: false
    });

    const [billetWeightParams, setBilletWeightParams] = useState({
        weightKg: 100,
        materialType: 'STAINLESS_STEEL'
    });

    const [rollerParams, setRollerParams] = useState({
        diameter: 102,
        faceLength: 1200,
        materialType: 'HDPE',
        quantity: 1
    });

    const [speedSensorParams, setSpeedSensorParams] = useState({
        materialType: 'STAINLESS_STEEL',
        design: 'HARD_ROCK',
        beltWidth: 1200,
        quantity: 1
    });

    const [tmdFrameParams, setTMDFrameParams] = useState({
        beltWidth: 1200,
        quantity: 1
    });

    // Sub-assembly state
    const [subAssemblies, setSubAssemblies] = useState([]);
    const [selectedSubAssemblies, setSelectedSubAssemblies] = useState({
        'weigh-module': { id: null, quantity: 1 },
        'billet-weight': { id: null, quantity: 1 },
        'speed-sensor': { id: null, quantity: 1 },
        'tmd-frame': { id: null, quantity: 1 }
    });

    // Load sub-assemblies from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'sub_assemblies'),
            (snapshot) => {
                const subAssemblyData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSubAssemblies(subAssemblyData);
            },
            (error) => {
                console.error('Error loading sub-assemblies:', error);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load products from Firestore
    const [products, setProducts] = useState([]);
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'products'),
            (snapshot) => {
                const productData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Filter products that differ from sub-assemblies if needed, 
                // but we will filter by componentCategory later anyway.
                setProducts(productData);
            },
            (error) => {
                console.error('Error loading products:', error);
            }
        );

        return () => unsubscribe();
    }, []);

    // Load weigher models
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'weigher_models'),
            (snapshot) => {
                const models = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                models.sort((a, b) => a.code.localeCompare(b.code));
                setWeigherModels(models);

                if (models.length > 0 && !weighModuleParams.modelId) {
                    setWeighModuleParams(prev => ({ ...prev, modelId: models[0].id }));
                }
            }
        );

        return () => unsubscribe();
    }, [weighModuleParams.modelId]);

    const handleEstimate = async () => {
        setEstimating(true);
        setError('');
        setResult(null);

        try {
            let estimationResult;

            switch (componentType) {
                case 'weigh-module': {
                    const subAssembly = selectedSubAssemblies['weigh-module'].id ? selectedSubAssemblies['weigh-module'] : null;
                    estimationResult = await estimateWeighModuleCost(weighModuleParams, dateRange, subAssembly);
                    break;
                }
                case 'idler-frame':
                    estimationResult = await estimateIdlerFrameCost(idlerFrameParams, dateRange);
                    break;
                case 'billet-weight': {
                    const subAssembly = selectedSubAssemblies['billet-weight'].id ? selectedSubAssemblies['billet-weight'] : null;
                    estimationResult = await estimateBilletWeightCost(billetWeightParams, dateRange, subAssembly);
                    break;
                }
                case 'roller':
                    estimationResult = await estimateRollerCost(rollerParams, dateRange);
                    break;
                case 'speed-sensor': {
                    const subAssembly = selectedSubAssemblies['speed-sensor'].id ? selectedSubAssemblies['speed-sensor'] : null;
                    estimationResult = await estimateSpeedSensorCost(speedSensorParams, dateRange, subAssembly);
                    break;
                }
                case 'tmd-frame': {
                    const subAssembly = selectedSubAssemblies['tmd-frame'].id ? selectedSubAssemblies['tmd-frame'] : null;
                    estimationResult = await estimateTMDFrameCost(tmdFrameParams, dateRange, subAssembly);
                    break;
                }
                default:
                    throw new Error('Invalid component type');
            }

            if (estimationResult.success) {
                setResult(estimationResult);
            } else {
                setError(estimationResult.error);
            }
        } catch (err) {
            console.error('Estimation error:', err);
            setError(err.message || 'Failed to estimate cost');
        } finally {
            setEstimating(false);
        }
    };

    const getConfidenceBadge = (confidence) => {
        const colorMap = {
            emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            red: 'bg-red-500/20 text-red-400 border-red-500/30'
        };

        const dots = Math.round(confidence.score / 20);

        return (
            <div className={`px-3 py-1.5 rounded-lg border ${colorMap[confidence.color]} font-medium inline-flex items-center gap-2`}>
                <span>{confidence.level}</span>
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${i < dots ? `bg-${confidence.color}-400` : 'bg-slate-600'
                                }`}
                        />
                    ))}
                </div>
                <span className="text-xs opacity-75">({Math.round(confidence.score)}%)</span>
            </div>
        );
    };

    // Helper function to get sub-assemblies and products for a specific component type
    const getSubAssembliesForComponent = (componentCategory) => {
        const allItems = [...subAssemblies, ...products];
        return allItems.filter(item =>
            item.componentCategory === componentCategory
        );
    };

    // Helper function to render sub-assembly selector
    const renderSubAssemblySelector = (componentKey, componentCategory, showQuantity = false) => {
        const availableSubAssemblies = getSubAssembliesForComponent(componentCategory);

        if (availableSubAssemblies.length === 0) {
            return null; // Don't show selector if no sub-assemblies available
        }

        return (
            <div className="mt-3 pt-3 border-t border-slate-700">
                <label className="block text-xs text-slate-400 mb-1">Sub-Assembly (Optional)</label>
                <div className="grid grid-cols-1 gap-2">
                    <select
                        value={selectedSubAssemblies[componentKey].id || ''}
                        onChange={(e) => setSelectedSubAssemblies(prev => ({
                            ...prev,
                            [componentKey]: { ...prev[componentKey], id: e.target.value || null }
                        }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">None</option>
                        {availableSubAssemblies.map(sa => (
                            <option key={sa.id} value={sa.id}>
                                {sa.name} {sa.sku ? `(${sa.sku})` : ''}
                            </option>
                        ))}
                    </select>
                    {showQuantity && selectedSubAssemblies[componentKey].id && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Sub-Assembly Quantity</label>
                            <input
                                type="number"
                                min="1"
                                value={selectedSubAssemblies[componentKey].quantity}
                                onChange={(e) => setSelectedSubAssemblies(prev => ({
                                    ...prev,
                                    [componentKey]: { ...prev[componentKey], quantity: parseInt(e.target.value) || 1 }
                                }))}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Icons.Calculator size={28} className="text-purple-400" />
                    Cost Estimator
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Get cost estimates based on historical data using smart matching and interpolation
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Configuration */}
                <div className="space-y-4">
                    {/* Component Type Selection */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Component Type <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setComponentType('weigh-module'); setResult(null); }}
                                className={`p-3 rounded-lg border-2 transition-all ${componentType === 'weigh-module'
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Icons.Scale size={20} className="mx-auto mb-1" />
                                <div className="text-xs">Weigh Module</div>
                            </button>
                            <button
                                onClick={() => { setComponentType('idler-frame'); setResult(null); }}
                                className={`p-3 rounded-lg border-2 transition-all ${componentType === 'idler-frame'
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Icons.Triangle size={20} className="mx-auto mb-1" />
                                <div className="text-xs">Idler Frame</div>
                            </button>
                            <button
                                onClick={() => { setComponentType('billet-weight'); setResult(null); }}
                                className={`p-3 rounded-lg border-2 transition-all ${componentType === 'billet-weight'
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Icons.Weight size={20} className="mx-auto mb-1" />
                                <div className="text-xs">Billet Weight</div>
                            </button>
                            <button
                                onClick={() => { setComponentType('roller'); setResult(null); }}
                                className={`p-3 rounded-lg border-2 transition-all ${componentType === 'roller'
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Icons.Circle size={20} className="mx-auto mb-1" />
                                <div className="text-xs">Roller</div>
                            </button>
                            <button
                                onClick={() => { setComponentType('speed-sensor'); setResult(null); }}
                                className={`p-3 rounded-lg border-2 transition-all ${componentType === 'speed-sensor'
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Icons.Gauge size={20} className="mx-auto mb-1" />
                                <div className="text-xs">Speed Sensor</div>
                            </button>
                            <button
                                onClick={() => { setComponentType('tmd-frame'); setResult(null); }}
                                className={`p-3 rounded-lg border-2 transition-all ${componentType === 'tmd-frame'
                                    ? 'border-purple-500 bg-purple-500/10 text-white'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                                    }`}
                            >
                                <Icons.Magnet size={20} className="mx-auto mb-1" />
                                <div className="text-xs">TMD Frame</div>
                            </button>
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Historical Data Range
                        </label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value={3}>Last 3 months</option>
                            <option value={6}>Last 6 months</option>
                            <option value={12}>Last 12 months</option>
                            <option value={24}>Last 24 months</option>
                            <option value="all">All time</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1.5">
                            <Icons.Info size={12} className="inline mr-1" />
                            Recent data is weighted higher in calculations
                        </p>
                    </div>

                    {/* Component-Specific Parameters */}
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <h3 className="text-sm font-medium text-white mb-3">Parameters</h3>

                        {/* Weigh Module Parameters */}
                        {componentType === 'weigh-module' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Weigher Model</label>
                                    <select
                                        value={weighModuleParams.modelId}
                                        onChange={(e) => setWeighModuleParams(prev => ({ ...prev, modelId: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">-- Select --</option>
                                        {weigherModels.map(m => (
                                            <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Belt Width (mm)</label>
                                        <select
                                            value={weighModuleParams.beltWidth}
                                            onChange={(e) => setWeighModuleParams(prev => ({ ...prev, beltWidth: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {STANDARD_BELT_WIDTHS.map(w => (
                                                <option key={w} value={w}>{w}mm</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Material</label>
                                        <select
                                            value={weighModuleParams.materialType}
                                            onChange={(e) => setWeighModuleParams(prev => ({ ...prev, materialType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="STAINLESS_STEEL">{MATERIAL_TYPES.STAINLESS_STEEL}</option>
                                            <option value="GALVANISED">{MATERIAL_TYPES.GALVANISED}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Capacity (kg/m)</label>
                                        <input
                                            type="number"
                                            value={weighModuleParams.capacityKgPerM}
                                            onChange={(e) => setWeighModuleParams(prev => ({ ...prev, capacityKgPerM: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Idler Spacing (mm)</label>
                                        <select
                                            value={weighModuleParams.idlerSpacing}
                                            onChange={(e) => setWeighModuleParams(prev => ({ ...prev, idlerSpacing: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {IDLER_SPACING_OPTIONS.map(s => (
                                                <option key={s} value={s}>{s}mm</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {/* Sub-Assembly Selector for Weigh Module */}
                                {renderSubAssemblySelector('weigh-module', 'Weigh Module', false)}
                            </div>
                        )}

                        {/* Idler Frame Parameters */}
                        {componentType === 'idler-frame' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Belt Width (mm)</label>
                                        <select
                                            value={idlerFrameParams.beltWidth}
                                            onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, beltWidth: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {STANDARD_BELT_WIDTHS.map(w => (
                                                <option key={w} value={w}>{w}mm</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Material</label>
                                        <select
                                            value={idlerFrameParams.materialType}
                                            onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, materialType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="STAINLESS_STEEL">{MATERIAL_TYPES.STAINLESS_STEEL}</option>
                                            <option value="GALVANISED">{MATERIAL_TYPES.GALVANISED}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Capacity (kg/m)</label>
                                        <input
                                            type="number"
                                            value={idlerFrameParams.capacityKgPerM}
                                            onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, capacityKgPerM: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={idlerFrameParams.quantity}
                                            onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Transom Type</label>
                                        <select
                                            value={idlerFrameParams.transomType}
                                            onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, transomType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="ANGLE">{TRANSOM_TYPES.ANGLE}</option>
                                            <option value="SHS">{TRANSOM_TYPES.SHS}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Roller Design</label>
                                        <select
                                            value={idlerFrameParams.rollerDesign}
                                            onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, rollerDesign: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="ONE_ROLLER">{ROLLER_DESIGNS.ONE_ROLLER}</option>
                                            <option value="THREE_ROLLER">{ROLLER_DESIGNS.THREE_ROLLER}</option>
                                            <option value="FIVE_ROLLER">{ROLLER_DESIGNS.FIVE_ROLLER}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="hasCams"
                                        checked={idlerFrameParams.hasCams}
                                        onChange={(e) => setIdlerFrameParams(prev => ({ ...prev, hasCams: e.target.checked }))}
                                        className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
                                    />
                                    <label htmlFor="hasCams" className="text-sm text-slate-300">Has Cams</label>
                                </div>
                            </div>
                        )}

                        {/* Billet Weight Parameters */}
                        {componentType === 'billet-weight' && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
                                    <input
                                        type="number"
                                        value={billetWeightParams.weightKg}
                                        onChange={(e) => setBilletWeightParams(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Material Type</label>
                                    <select
                                        value={billetWeightParams.materialType}
                                        onChange={(e) => setBilletWeightParams(prev => ({ ...prev, materialType: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="STAINLESS_STEEL">{MATERIAL_TYPES.STAINLESS_STEEL}</option>
                                        <option value="GALVANISED">{MATERIAL_TYPES.GALVANISED}</option>
                                    </select>
                                </div>
                                {/* Sub-Assembly Selector for Billet Weight */}
                                {renderSubAssemblySelector('billet-weight', 'Billet Weight', false)}
                            </div>
                        )}

                        {/* Roller Parameters */}
                        {componentType === 'roller' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Diameter (mm)</label>
                                        <select
                                            value={rollerParams.diameter}
                                            onChange={(e) => setRollerParams(prev => ({ ...prev, diameter: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {STANDARD_ROLLER_DIAMETERS.map(d => (
                                                <option key={d} value={d}>{d}mm</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Face Length (mm)</label>
                                        <input
                                            type="number"
                                            value={rollerParams.faceLength}
                                            onChange={(e) => setRollerParams(prev => ({ ...prev, faceLength: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Material</label>
                                        <select
                                            value={rollerParams.materialType}
                                            onChange={(e) => setRollerParams(prev => ({ ...prev, materialType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="HDPE">{ROLLER_MATERIAL_TYPES.HDPE}</option>
                                            <option value="STEEL">{ROLLER_MATERIAL_TYPES.STEEL}</option>
                                            <option value="STEEL_HYBRID">{ROLLER_MATERIAL_TYPES.STEEL_HYBRID}</option>
                                            <option value="ALUMINIUM">{ROLLER_MATERIAL_TYPES.ALUMINIUM}</option>
                                            <option value="FRAS">{ROLLER_MATERIAL_TYPES.FRAS}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={rollerParams.quantity}
                                            onChange={(e) => setRollerParams(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Speed Sensor Parameters */}
                        {componentType === 'speed-sensor' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Material</label>
                                        <select
                                            value={speedSensorParams.materialType}
                                            onChange={(e) => setSpeedSensorParams(prev => ({ ...prev, materialType: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="STAINLESS_STEEL">{MATERIAL_TYPES.STAINLESS_STEEL}</option>
                                            <option value="GALVANISED">{MATERIAL_TYPES.GALVANISED}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Design</label>
                                        <select
                                            value={speedSensorParams.design}
                                            onChange={(e) => setSpeedSensorParams(prev => ({ ...prev, design: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="HARD_ROCK">{SPEED_SENSOR_DESIGNS.HARD_ROCK}</option>
                                            <option value="SOFT_ROCK">{SPEED_SENSOR_DESIGNS.SOFT_ROCK}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Belt Width (mm)</label>
                                        <select
                                            value={speedSensorParams.beltWidth}
                                            onChange={(e) => setSpeedSensorParams(prev => ({ ...prev, beltWidth: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {STANDARD_BELT_WIDTHS.map(w => (
                                                <option key={w} value={w}>{w}mm</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={speedSensorParams.quantity}
                                            onChange={(e) => setSpeedSensorParams(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                {/* Sub-Assembly Selector for Speed Sensor */}
                                {renderSubAssemblySelector('speed-sensor', 'Speed Sensor', true)}
                            </div>
                        )}

                        {/* TMD Frame Parameters */}
                        {componentType === 'tmd-frame' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Belt Width (mm)</label>
                                        <select
                                            value={tmdFrameParams.beltWidth}
                                            onChange={(e) => setTMDFrameParams(prev => ({ ...prev, beltWidth: parseInt(e.target.value) }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            {STANDARD_BELT_WIDTHS.map(w => (
                                                <option key={w} value={w}>{w}mm</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={tmdFrameParams.quantity}
                                            onChange={(e) => setTMDFrameParams(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                {/* Sub-Assembly Selector for TMD Frame */}
                                {renderSubAssemblySelector('tmd-frame', 'TMD Frame', true)}
                            </div>
                        )}
                    </div>

                    {/* Estimate Button */}
                    <button
                        onClick={handleEstimate}
                        disabled={estimating || (componentType === 'weigh-module' && !weighModuleParams.modelId)}
                        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {estimating ? (
                            <>
                                <Icons.Loader size={20} className="animate-spin" />
                                Estimating...
                            </>
                        ) : (
                            <>
                                <Icons.Calculator size={20} />
                                Estimate Cost
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column - Results */}
                <div>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-3">
                                <Icons.AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-red-400">Estimation Failed</h4>
                                    <p className="text-sm text-red-300/80 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {result && result.supplierEstimates && result.supplierEstimates.length > 0 && (
                        <div className="space-y-4">
                            {/* Header showing total suppliers */}
                            <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Icons.Building size={16} className="text-cyan-400" />
                                    <span className="text-white font-medium">
                                        {result.totalSuppliers} Supplier{result.totalSuppliers !== 1 ? 's' : ''} Found
                                    </span>
                                    <span className="text-slate-400">- Showing independent estimates</span>
                                </div>
                            </div>

                            {/* Supplier Estimate Cards */}
                            {result.supplierEstimates.map((estimate, idx) => (
                                <div key={idx} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                    {/* Supplier Header */}
                                    <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border-b border-slate-700 p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icons.Building size={20} className="text-cyan-400" />
                                            <h3 className="text-lg font-bold text-white">{estimate.supplierName}</h3>
                                        </div>

                                        {/* Estimated Cost */}
                                        {estimate.quantity && estimate.quantity > 1 ? (
                                            <>
                                                <div className="text-sm text-slate-400 mb-1">Estimated Cost</div>
                                                <div className="flex items-baseline gap-4 mb-3">
                                                    <div>
                                                        <div className="text-xs text-slate-500 mb-0.5">Cost/Unit</div>
                                                        <div className="text-3xl font-bold text-emerald-400">
                                                            {formatCurrency(estimate.estimatedCostPerUnit)}
                                                        </div>
                                                    </div>
                                                    <div className="text-2xl text-slate-600">×</div>
                                                    <div>
                                                        <div className="text-xs text-slate-500 mb-0.5">Qty: {estimate.quantity}</div>
                                                        <div className="text-3xl font-bold text-cyan-400">
                                                            {formatCurrency(estimate.estimatedCostTotal)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-sm text-slate-400 mb-1">Estimated Cost</div>
                                                <div className="text-4xl font-bold text-white mb-3">
                                                    {formatCurrency(estimate.estimatedCost)}
                                                </div>
                                            </>
                                        )}

                                        {/* Cost Breakdown for Sub-Assemblies */}
                                        {estimate.hasSubAssembly && (
                                            <div className="mt-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                                                <div className="text-xs font-medium text-slate-300 mb-2">Cost Breakdown</div>
                                                <div className="space-y-1.5 text-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400">Base Component:</span>
                                                        <span className="text-white font-medium">{formatCurrency(estimate.baseComponentCost)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-400">
                                                            Sub-Assembly {estimate.subAssemblyQuantity > 1 ? `(×${estimate.subAssemblyQuantity})` : ''}:
                                                        </span>
                                                        <span className="text-cyan-400 font-medium">{formatCurrency(estimate.subAssemblyCost)}</span>
                                                    </div>
                                                    <div className="border-t border-slate-600 pt-1.5 mt-1.5 flex justify-between items-center">
                                                        <span className="text-white font-medium">Total Cost:</span>
                                                        <span className="text-emerald-400 font-bold text-lg">{formatCurrency(estimate.estimatedCost)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}


                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">Confidence:</span>
                                            {getConfidenceBadge(estimate.confidence)}
                                        </div>

                                        {estimate.quantityAdjusted && (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
                                                <Icons.CheckCircle size={14} />
                                                <span>Quantity-based pricing applied</span>
                                                {estimate.quantityRange && (
                                                    <span className="text-slate-400">({estimate.quantityRange} units)</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Estimation Details */}
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Calculation Method</div>
                                            <div className="text-sm text-white font-medium">{estimate.method}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-slate-400 mb-1">Data Points Used</div>
                                                <div className="text-sm text-white font-medium">{estimate.dataPoints}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400 mb-1">Date Range</div>
                                                <div className="text-sm text-white font-medium">{estimate.dateRange}</div>
                                            </div>
                                        </div>

                                        {estimate.category && (
                                            <div>
                                                <div className="text-xs text-slate-400 mb-1">Weight Category</div>
                                                <div className="text-sm text-white font-medium">{estimate.category}</div>
                                            </div>
                                        )}

                                        {/* Matching Entries for this supplier */}
                                        <div>
                                            <div className="text-xs text-slate-400 mb-2">Historical Entries ({estimate.supplierName})</div>
                                            <MatchingEntriesTable entries={estimate.matchingEntries} />
                                        </div>

                                        {/* Info Note */}
                                        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                                            <Icons.Info size={14} className="flex-shrink-0 mt-0.5" />
                                            <div>
                                                This estimate is based on historical data from {estimate.supplierName} only.
                                                Recent entries are weighted more heavily. Always verify with current supplier pricing.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!result && !error && (
                        <div className="bg-slate-900 rounded-lg border border-slate-700 p-12 text-center">
                            <Icons.Calculator size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">
                                Select parameters and click "Estimate Cost" to get a prediction based on historical data
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
