import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Icons } from '../../constants/icons';
import { getBuildGuideWithBOM, deleteBuildGuide } from '../../services/buildGuideService';
import { BuildGuideModal } from './BuildGuideModal';
import { exportBuildGuideToPDF } from '../../utils/pdfExport';
import { useResizableColumns } from '../../hooks/useResizableColumns';

/**
 * Build Guide Manager Component
 * @description Main view for managing product build guides in the inventory system.
 * Allows users to select a product, view/edit build instructions, and see associated BOM.
 */
export function BuildGuideManager() {
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [buildGuideData, setBuildGuideData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    // Load products on mount
    useEffect(() => {
        loadProducts();
    }, []);

    // Load build guide when product changes
    useEffect(() => {
        if (selectedProductId) {
            loadBuildGuide(selectedProductId);
        } else {
            setBuildGuideData(null);
        }
    }, [selectedProductId]);

    const loadProducts = async () => {
        try {
            const productsSnap = await getDocs(collection(db, 'products'));
            const productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error('Error loading products:', err);
            setError('Failed to load products');
        }
    };

    const loadBuildGuide = async (productId) => {
        setLoading(true);
        setError('');
        try {
            const data = await getBuildGuideWithBOM(productId);
            setBuildGuideData(data);
        } catch (err) {
            console.error('Error loading build guide:', err);
            setError('Failed to load build guide');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGuide = () => {
        setIsModalOpen(true);
    };

    const handleEditGuide = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSaveSuccess = () => {
        setIsModalOpen(false);
        loadBuildGuide(selectedProductId);
    };

    const handleDeleteGuide = async () => {
        if (!window.confirm('Are you sure you want to delete this build guide? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteBuildGuide(selectedProductId);
            setBuildGuideData({ ...buildGuideData, guide: null });
        } catch (err) {
            console.error('Error deleting build guide:', err);
            setError('Failed to delete build guide');
        }
    };

    const handleExportPDF = async () => {
        if (!buildGuideData?.guide || !selectedProduct) {
            setError('No build guide available to export');
            return;
        }

        setExporting(true);
        setError('');

        try {
            await exportBuildGuideToPDF(selectedProduct, buildGuideData.guide, buildGuideData.bom);
        } catch (err) {
            console.error('Error exporting PDF:', err);
            setError('Failed to export PDF: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Icons.ClipboardList size={24} />
                            Product Build Guides
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Create assembly instructions for products with BOM references
                        </p>
                    </div>
                </div>

                {/* Product Selector */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select Product
                    </label>
                    <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <option value="">-- Select a product --</option>
                        {products.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-red-400">
                        <Icons.AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {!selectedProductId ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-slate-400">
                        <Icons.ClipboardList size={64} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Select a product to view or create a build guide</p>
                    </div>
                </div>
            ) : loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Icons.Loader size={48} className="animate-spin text-cyan-500" />
                </div>
            ) : buildGuideData?.guide ? (
                /* Display Existing Guide */
                <div className="flex-1 overflow-auto space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exporting ? (
                                <>
                                    <Icons.Loader size={18} className="animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Icons.Download size={18} />
                                    Export PDF
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleEditGuide}
                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                        >
                            <Icons.Edit size={18} />
                            Edit Guide
                        </button>
                        <button
                            onClick={handleDeleteGuide}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                        >
                            <Icons.Trash size={18} />
                            Delete Guide
                        </button>
                    </div>

                    {/* BOM Section */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Icons.Package size={20} />
                                Bill of Materials
                            </h3>
                        </div>
                        {buildGuideData.bom.parts.length === 0 && buildGuideData.bom.fasteners.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 italic">No BOM items for this product</div>
                        ) : (
                            <BOMTable
                                parts={buildGuideData.bom.parts}
                                fasteners={buildGuideData.bom.fasteners}
                            />
                        )}
                    </div>

                    {/* Build Steps */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <Icons.List size={20} />
                            Assembly Instructions
                        </h3>
                        <div className="space-y-3">
                            {buildGuideData.guide.steps.map((step) => (
                                <div key={step.stepNumber} className="bg-slate-700/50 p-4 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {step.stepNumber}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white">{step.instruction}</p>
                                            {step.notes && (
                                                <p className="text-slate-400 text-sm mt-2 italic">
                                                    Note: {step.notes}
                                                </p>
                                            )}
                                            {step.imageUrl && (
                                                <div className="mt-3">
                                                    <img
                                                        src={step.imageUrl}
                                                        alt={`Step ${step.stepNumber}`}
                                                        className="max-w-md w-full h-auto rounded-lg border border-slate-600 cursor-pointer hover:border-cyan-500 transition-colors"
                                                        onClick={() => window.open(step.imageUrl, '_blank')}
                                                        title="Click to view full size"
                                                    />
                                                </div>
                                            )}
                                            {step.itemsUsed && step.itemsUsed.length > 0 && (
                                                <div className="mt-3 p-3 bg-slate-800/50 rounded border-l-4 border-cyan-500">
                                                    <h5 className="text-xs font-medium text-cyan-400 mb-2">
                                                        Materials Used:
                                                    </h5>
                                                    <div className="space-y-1">
                                                        {step.itemsUsed.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                                <span className="text-slate-300">
                                                                    {item.sku} - {item.description}
                                                                </span>
                                                                <span className="text-cyan-400 font-medium">
                                                                    {item.quantityUsed} {item.unit || ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* No Guide - Show Create Button */
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Icons.ClipboardList size={64} className="mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 mb-4">No build guide exists for this product</p>
                        <button
                            onClick={handleCreateGuide}
                            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors mx-auto"
                        >
                            <Icons.Plus size={20} />
                            Create Build Guide
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedProduct && (
                <BuildGuideModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    product={selectedProduct}
                    existingGuide={buildGuideData?.guide}
                    bom={buildGuideData?.bom}
                    onSuccess={handleSaveSuccess}
                />
            )}
        </div>
    );
}

const BOMTable = ({ parts, fasteners }) => {
    const tableRef = React.useRef(null);
    const { columnWidths, handleResizeStart, autoFitColumn } = useResizableColumns([120, 150, 250, 100, 100]);

    const bomItems = [
        ...parts.map(p => ({ ...p, type: 'Part' })),
        ...fasteners.map(f => ({ ...f, unit: 'pcs', type: 'Fastener' }))
    ];

    return (
        <div className="overflow-x-auto">
            <table ref={tableRef} className="text-left text-sm" style={{ tableLayout: 'auto' }}>
                <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[0]}px` }}>
                            <div className="column-content">Type</div>
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(0, e)} onDoubleClick={() => autoFitColumn(0, tableRef)} onClick={(e) => e.stopPropagation()} />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[1]}px` }}>
                            <div className="column-content">Part Number</div>
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(1, e)} onDoubleClick={() => autoFitColumn(1, tableRef)} onClick={(e) => e.stopPropagation()} />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[2]}px` }}>
                            <div className="column-content">Description</div>
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(2, e)} onDoubleClick={() => autoFitColumn(2, tableRef)} onClick={(e) => e.stopPropagation()} />
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[3]}px` }}>
                            <div className="column-content">Quantity</div>
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(3, e)} onDoubleClick={() => autoFitColumn(3, tableRef)} onClick={(e) => e.stopPropagation()} />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase relative" style={{ width: `${columnWidths[4]}px` }}>
                            <div className="column-content">Unit</div>
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-400 active:bg-cyan-500 transition-colors" onMouseDown={(e) => handleResizeStart(4, e)} onDoubleClick={() => autoFitColumn(4, tableRef)} onClick={(e) => e.stopPropagation()} />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {bomItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/50">
                            <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded border ${item.type === 'Part'
                                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                        : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                    }`}>
                                    {item.type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-white font-medium font-mono text-sm">{item.partNumber}</td>
                            <td className="px-4 py-3 text-slate-300 text-sm">{item.description}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-mono">{item.quantityUsed}</td>
                            <td className="px-4 py-3 text-slate-400 text-sm">{item.unit}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
