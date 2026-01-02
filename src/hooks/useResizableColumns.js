import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for resizable table columns
 * - Session-only state (no persistence)
 * - Drag to resize columns
 * - Double-click to auto-fit content
 * - Table grows/shrinks with column resizing
 */
export const useResizableColumns = (defaultWidths) => {
    const [columnWidths, setColumnWidths] = useState(defaultWidths);
    const resizingColumn = useRef(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleResizeStart = useCallback((columnIndex, e) => {
        e.preventDefault();
        e.stopPropagation();

        resizingColumn.current = columnIndex;
        startX.current = e.clientX;
        startWidth.current = columnWidths[columnIndex] || 150;

        const handleMouseMove = (e) => {
            if (resizingColumn.current === null) return;

            const diff = e.clientX - startX.current;
            const newWidth = Math.max(80, startWidth.current + diff); // Minimum 80px

            setColumnWidths(prev => {
                const updated = [...prev];
                updated[resizingColumn.current] = newWidth;
                return updated;
            });
        };

        const handleMouseUp = () => {
            resizingColumn.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidths]);

    const autoFitColumn = useCallback((columnIndex, tableRef) => {
        if (!tableRef?.current) return;

        const table = tableRef.current;
        const headerCells = table.querySelectorAll('thead th');
        const bodyCells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`);

        let maxWidth = 80; // Minimum width

        // Measure header content
        if (headerCells[columnIndex]) {
            const headerContent = headerCells[columnIndex].querySelector('.column-content') || headerCells[columnIndex];
            maxWidth = Math.max(maxWidth, headerContent.scrollWidth + 32);
        }

        // Measure body content (sample first 50 rows for performance)
        const sampleSize = Math.min(50, bodyCells.length);
        for (let i = 0; i < sampleSize; i++) {
            if (bodyCells[i]) {
                maxWidth = Math.max(maxWidth, bodyCells[i].scrollWidth + 32);
            }
        }

        setColumnWidths(prev => {
            const updated = [...prev];
            updated[columnIndex] = maxWidth;
            return updated;
        });
    }, []);

    return {
        columnWidths,
        handleResizeStart,
        autoFitColumn
    };
};
