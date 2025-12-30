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

    // Recalculate available items when steps change
    useEffect(() => {
        if (bom && steps.length > 0) {
            calculateAvailableItems();
        }
    }, [steps, bom]);

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
    }
};

