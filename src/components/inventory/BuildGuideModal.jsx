import React, { useState, useEffect } from 'react';
import { Icons } from '../../constants/icons';
import { saveBuildGuide, uploadStepImage, deleteStepImage } from '../../services/buildGuideService';
import { validateImageFile } from '../../utils/imageCompression';

/**
 * Build Guide Modal Component
 * @description Modal for creating and editing product build guides with step management
 */
export function BuildGuideModal({ isOpen, onClose, product, existingGuide, bom, onSuccess }) {
    const [steps, setSteps] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showBOM, setShowBOM] = useState(false);
    const [uploadingImages, setUploadingImages] = useState({});
    const [availableItems, setAvailableItems] = useState({ parts: [], fasteners: [] });

    // Initialize steps with itemsUsed array
    useEffect(() => {
        if (existingGuide?.steps) {
            setSteps(existingGuide.steps.map(step => ({
                ...step,
                itemsUsed: step.itemsUsed || []
            })));
        } else {
            setSteps([{
                stepNumber: 1,
                instruction: '',
                notes: '',
                imageUrl: null,
                imagePath: null,
                itemsUsed: []
            }]);
        }
    }, [existingGuide]);

    // Calculate available items based on what's been allocated to steps
    const calculateAvailableItems = () => {
        if (!bom) {
            setAvailableItems({ parts: [], fasteners: [] });
            return;
        }
        const allocated = {};

        steps.forEach(step => {
            step.itemsUsed?.forEach(item => {
                const key = `${item.type}-${item.id}`;
                allocated[key] = (allocated[key] || 0) + (parseInt(item.quantityUsed) || 0);
            });
        });

        const availableParts = (bom.parts || []).map(part => ({
            ...part,
            id: part.partId,
            sku: part.partNumber,
            totalQty: part.quantityUsed,
            allocated: allocated[`part-${part.partId}`] || 0,
            remainingQty: part.quantityUsed - (allocated[`part-${part.partId}`] || 0)
        }));

        const availableFasteners = (bom.fasteners || []).map(fastener => ({
            ...fastener,
            id: fastener.fastenerId,
            sku: fastener.partNumber,
            totalQty: fastener.quantityUsed,
            allocated: allocated[`fastener-${fastener.fastenerId}`] || 0,
            remainingQty: fastener.quantityUsed - (allocated[`fastener-${fastener.fastenerId}`] || 0)
        }));

        setAvailableItems({ parts: availableParts, fasteners: availableFasteners });
    };

    const handleAddItemToStep = (stepIndex, itemKey) => {
        console.log('[DEBUG] handleAddItemToStep called:', { stepIndex, itemKey, availableItems });
        if (!itemKey) return;

        // Split only on the first hyphen (IDs may contain hyphens)
        const firstHyphenIndex = itemKey.indexOf('-');
        const type = itemKey.substring(0, firstHyphenIndex);
        const id = itemKey.substring(firstHyphenIndex + 1);
        console.log('[DEBUG] Parsed:', { type, id });

        const itemList = availableItems[type === 'part' ? 'parts' : 'fasteners'];
        console.log('[DEBUG] ItemList:', itemList);

        const item = itemList.find(i => i.id === id);
        console.log('[DEBUG] Found item:', item);

        if (!item) {
            console.warn('[DEBUG] Item not found!');
            return;
        }

        const existingItem = steps[stepIndex].itemsUsed?.find(i => i.type === type && i.id === id);
        if (existingItem) {
            setError('This item is already added to this step');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const newItem = {
            type, id, sku: item.sku, description: item.description,
            quantityUsed: 1, unit: item.unit || (type === 'part' ? 'ea' : '')
        };
        console.log('[DEBUG] Adding newItem:', newItem);

        const newSteps = [...steps];
        newSteps[stepIndex].itemsUsed = [...(newSteps[stepIndex].itemsUsed || []), newItem];
        setSteps(newSteps);
        console.log('[DEBUG] Steps updated');
    };

    const handleUpdateItemQuantity = (stepIndex, itemIndex, quantity) => {
        const newSteps = [...steps];
        newSteps[stepIndex].itemsUsed[itemIndex].quantityUsed = parseInt(quantity) || 1;
        setSteps(newSteps);
    };

    const handleRemoveItemFromStep = (stepIndex, itemIndex) => {
        const newSteps = [...steps];
        newSteps[stepIndex].itemsUsed.splice(itemIndex, 1);
        setSteps(newSteps);
    };

    // Recalculate available items when steps change
    useEffect(() => {
        if (bom && steps.length > 0) {
            calculateAvailableItems();
        }
    }, [steps, bom, calculateAvailableItems]);

    if (!isOpen) return null;

    const handleAddStep = () => {
        setSteps([...steps, {
            stepNumber: steps.length + 1,
            instruction: '',
            notes: '',
            imageUrl: null,
            imagePath: null,
            itemsUsed: []
        }]);
    };

    const handleRemoveStep = async (index) => {
        if (steps.length === 1) {
            setError('At least one step is required');
            return;
        }

        const stepToRemove = steps[index];

        // Delete image if present
        if (stepToRemove.imagePath) {
            try {
                await deleteStepImage(stepToRemove.imagePath);
            } catch (err) {
                console.warn('Failed to delete step image:', err);
            }
        }

        const newSteps = steps.filter((_, i) => i !== index);
        // Renumber steps
        const renumbered = newSteps.map((step, i) => ({ ...step, stepNumber: i + 1 }));
        setSteps(renumbered);
        setError('');
    };

    const handleMoveStepUp = (index) => {
        if (index === 0) return;
        const newSteps = [...steps];
        [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
        // Renumber
        const renumbered = newSteps.map((step, i) => ({ ...step, stepNumber: i + 1 }));
        setSteps(renumbered);
    };

    const handleMoveStepDown = (index) => {
        if (index === steps.length - 1) return;
        const newSteps = [...steps];
        [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        // Renumber
        const renumbered = newSteps.map((step, i) => ({ ...step, stepNumber: i + 1 }));
        setSteps(renumbered);
    };

    const handleUpdateStep = (index, field, value) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
        setError('');
    };

    const handleImageUpload = async (index, file) => {
        // Validate file
        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setUploadingImages(prev => ({ ...prev, [index]: true }));
        setError('');

        try {
            // Upload and compress
            const { url, path } = await uploadStepImage(product.id, steps[index].stepNumber, file);

            // Update step with image URL and path
            const newSteps = [...steps];

            // Delete old image if replacing
            if (newSteps[index].imagePath) {
                try {
                    await deleteStepImage(newSteps[index].imagePath);
                } catch (err) {
                    console.warn('Failed to delete old image:', err);
                }
            }

            newSteps[index] = {
                ...newSteps[index],
                imageUrl: url,
                imagePath: path
            };
            setSteps(newSteps);
        } catch (err) {
            console.error('Error uploading image:', err);
            setError('Failed to upload image: ' + err.message);
        } finally {
            setUploadingImages(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleRemoveImage = async (index) => {
        const step = steps[index];
        if (!step.imagePath) return;

        try {
            await deleteStepImage(step.imagePath);
            const newSteps = [...steps];
            newSteps[index] = {
                ...newSteps[index],
                imageUrl: null,
                imagePath: null
            };
            setSteps(newSteps);
        } catch (err) {
            console.error('Error removing image:', err);
            setError('Failed to remove image');
        }
    };

    const handleSave = async () => {
        // Validation
        const hasEmptyInstructions = steps.some(step => !step.instruction || step.instruction.trim() === '');
        if (hasEmptyInstructions) {
            setError('All steps must have instructions');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await saveBuildGuide(product.id, steps);
            onSuccess();
        } catch (err) {
            console.error('Error saving build guide:', err);
            setError(err.message || 'Failed to save build guide');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Icons.ClipboardList size={24} />
                            {existingGuide ? 'Edit Build Guide' : 'Create Build Guide'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Product: {product.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <Icons.X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-400">
                                <Icons.AlertCircle size={18} />
                                <span className="text-sm">{error}</span>
                            </div>
                        </div>
                    )}

                    {/* BOM Section (Collapsible) */}
                    {bom && (bom.parts?.length > 0 || bom.fasteners?.length > 0) && (
                        <div className="bg-slate-700/50 rounded-lg border border-slate-600">
                            <button
                                onClick={() => setShowBOM(!showBOM)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/70 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Icons.Package size={20} className="text-cyan-400" />
                                    <span className="font-medium text-white">Bill of Materials</span>
                                    <span className="text-sm text-slate-400">
                                        ({(bom.parts?.length || 0) + (bom.fasteners?.length || 0)} items)
                                    </span>
                                </div>
                                {showBOM ? <Icons.ChevronUp size={20} /> : <Icons.ChevronDown size={20} />}
                            </button>

                            {showBOM && (
                                <div className="p-4 pt-0 space-y-3">
                                    {bom.parts?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-300 mb-2">Parts</h4>
                                            <div className="space-y-1">
                                                {bom.parts.map(part => (
                                                    <div key={part.id} className="text-sm flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                                                        <span className="text-slate-300">{part.partNumber} - {part.description}</span>
                                                        <span className="text-cyan-400">Qty: {part.quantityUsed}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {bom.fasteners?.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-300 mb-2">Fasteners</h4>
                                            <div className="space-y-1">
                                                {bom.fasteners.map(fastener => (
                                                    <div key={fastener.id} className="text-sm flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded">
                                                        <span className="text-slate-300">{fastener.partNumber} - {fastener.description}</span>
                                                        <span className="text-cyan-400">Qty: {fastener.quantityUsed}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Build Steps */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Icons.List size={20} />
                                Assembly Steps
                            </h3>
                            <button
                                onClick={handleAddStep}
                                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-colors"
                            >
                                <Icons.Plus size={16} />
                                Add Step
                            </button>
                        </div>

                        <div className="space-y-4">
                            {steps.map((step, index) => (
                                <div key={index} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                    <div className="flex items-start gap-3">
                                        {/* Step Number */}
                                        <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {step.stepNumber}
                                        </div>

                                        {/* Step Content */}
                                        <div className="flex-1 space-y-3">
                                            {/* Instruction */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    Instruction *
                                                </label>
                                                <textarea
                                                    value={step.instruction}
                                                    onChange={(e) => handleUpdateStep(index, 'instruction', e.target.value)}
                                                    placeholder="Enter step instruction..."
                                                    rows={2}
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                                                />
                                            </div>

                                            {/* Notes (Optional) */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    Notes (Optional)
                                                </label>
                                                <textarea
                                                    value={step.notes}
                                                    onChange={(e) => handleUpdateStep(index, 'notes', e.target.value)}
                                                    placeholder="Add any additional notes or warnings..."
                                                    rows={1}
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                                                />
                                            </div>

                                            {/* Image Upload */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                                    Photo (Optional)
                                                </label>
                                                {step.imageUrl ? (
                                                    <div className="relative group">
                                                        <img
                                                            src={step.imageUrl}
                                                            alt={`Step ${step.stepNumber}`}
                                                            className="w-full h-48 object-cover rounded border border-slate-600"
                                                        />
                                                        <button
                                                            onClick={() => handleRemoveImage(index)}
                                                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Remove image"
                                                        >
                                                            <Icons.X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded cursor-pointer hover:border-cyan-500 hover:bg-slate-700/50 transition-colors">
                                                        <div className="flex flex-col items-center justify-center">
                                                            {uploadingImages[index] ? (
                                                                <>
                                                                    <Icons.Loader size={24} className="text-cyan-400 animate-spin mb-2" />
                                                                    <p className="text-sm text-cyan-400">Uploading & compressing...</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Icons.Image size={24} className="text-slate-400 mb-2" />
                                                                    <p className="text-sm text-slate-400">Click to upload image</p>
                                                                    <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP, HEIC (max 10MB)</p>
                                                                </>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleImageUpload(index, file);
                                                            }}
                                                            disabled={uploadingImages[index]}
                                                        />
                                                    </label>
                                                )}
                                            </div>

                                            {/* Parts & Fasteners Used in This Step */}
                                            <div className="border-t border-slate-600 mt-3 pt-3">
                                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                                    Parts & Fasteners Used in This Step
                                                </label>

                                                {/* Items allocated to this step */}
                                                {step.itemsUsed && step.itemsUsed.length > 0 && (
                                                    <div className="space-y-1.5 mb-2">
                                                        {step.itemsUsed.map((item, itemIdx) => (
                                                            <div key={itemIdx} className="flex items-center justify-between bg-slate-800 px-2.5 py-1.5 rounded">
                                                                <span className="text-sm text-slate-300 flex-1 truncate" title={`${item.sku} - ${item.description}`}>
                                                                    {item.sku} - {item.description}
                                                                </span>
                                                                <div className="flex items-center gap-2 ml-2">
                                                                    <input
                                                                        type="number"
                                                                        value={item.quantityUsed}
                                                                        onChange={(e) => handleUpdateItemQuantity(index, itemIdx, e.target.value)}
                                                                        className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center"
                                                                        min="1"
                                                                    />
                                                                    <span className="text-xs text-slate-400 w-6">{item.unit || ''}</span>
                                                                    <button
                                                                        onClick={() => handleRemoveItemFromStep(index, itemIdx)}
                                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                                        title="Remove item"
                                                                    >
                                                                        <Icons.X size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add item dropdown */}
                                                <select
                                                    onChange={(e) => {
                                                        handleAddItemToStep(index, e.target.value);
                                                        e.target.value = ''; // Reset dropdown
                                                    }}
                                                    value=""
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm hover:border-cyan-500 transition-colors"
                                                >
                                                    <option value="">+ Add part or fastener...</option>
                                                    {availableItems.parts.length > 0 && (
                                                        <optgroup label="Parts">
                                                            {availableItems.parts.map(part => (
                                                                <option
                                                                    key={part.id}
                                                                    value={`part-${part.id}`}
                                                                    disabled={part.remainingQty <= 0}
                                                                >
                                                                    {part.sku} - {part.description}
                                                                    ({part.remainingQty}/{part.totalQty} available)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {availableItems.fasteners.length > 0 && (
                                                        <optgroup label="Fasteners">
                                                            {availableItems.fasteners.map(fastener => (
                                                                <option
                                                                    key={fastener.id}
                                                                    value={`fastener-${fastener.id}`}
                                                                    disabled={fastener.remainingQty <= 0}
                                                                >
                                                                    {fastener.sku} - {fastener.description}
                                                                    ({fastener.remainingQty}/{fastener.totalQty} available)
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Step Controls */}
                                        <div className="flex-shrink-0 flex flex-col gap-1">
                                            <button
                                                onClick={() => handleMoveStepUp(index)}
                                                disabled={index === 0}
                                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Move up"
                                            >
                                                <Icons.ChevronUp size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleMoveStepDown(index)}
                                                disabled={index === steps.length - 1}
                                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Move down"
                                            >
                                                <Icons.ChevronDown size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveStep(index)}
                                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                title="Remove step"
                                            >
                                                <Icons.Trash size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Icons.Loader size={18} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Icons.Save size={18} />
                                Save Guide
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

