import imageCompression from 'browser-image-compression';

/**
 * Compress and optimize image for build guide storage
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @returns {Promise<File>} Compressed image file
 */
export const compressImage = async (file, options = {}) => {
    try {
        // Default compression options
        const defaultOptions = {
            maxSizeMB: 0.3,              // Target 300KB max
            maxWidthOrHeight: 1200,      // Max dimension 1200px
            useWebWorker: true,          // Don't block UI thread
            fileType: 'image/jpeg',      // Standardize to JPEG for best compression
            initialQuality: 0.8,         // 80% quality - good balance
            ...options
        };

        console.log('[ImageCompression] Original file:', {
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            type: file.type
        });

        // Compress the image
        const compressedFile = await imageCompression(file, defaultOptions);

        console.log('[ImageCompression] Compressed file:', {
            name: compressedFile.name,
            size: `${(compressedFile.size / 1024).toFixed(2)} KB`,
            reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`
        });

        return compressedFile;
    } catch (error) {
        console.error('[ImageCompression] Error compressing image:', error);
        throw new Error('Failed to compress image: ' + error.message);
    }
};

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export const validateImageFile = (file) => {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'image/bmp'];
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'File must be an image' };
    }

    // Check file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        return { valid: false, error: 'Image must be smaller than 10MB' };
    }

    return { valid: true };
};

/**
 * Create a preview URL for an image file
 * @param {File} file - Image file
 * @returns {string} Object URL for preview
 */
export const createImagePreview = (file) => {
    return URL.createObjectURL(file);
};

/**
 * Revoke preview URL to free memory
 * @param {string} url - Object URL to revoke
 */
export const revokeImagePreview = (url) => {
    URL.revokeObjectURL(url);
};
