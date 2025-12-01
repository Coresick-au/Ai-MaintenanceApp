// src/context/UndoContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const UndoContext = createContext();

export const UndoProvider = ({ children }) => {
    const [undoStack, setUndoStack] = useState([]);
    const MAX_UNDO_STACK_SIZE = 10;

    // Add an action to the undo stack
    const addUndoAction = useCallback((action) => {
        setUndoStack((prev) => {
            const newStack = [action, ...prev].slice(0, MAX_UNDO_STACK_SIZE);
            return newStack;
        });
    }, []);

    // Perform undo
    const performUndo = useCallback(() => {
        if (undoStack.length === 0) return false;

        const [lastAction, ...rest] = undoStack;

        // Execute the undo function
        if (lastAction.undo && typeof lastAction.undo === 'function') {
            try {
                lastAction.undo();
                setUndoStack(rest);
                return true;
            } catch (error) {
                console.error('Undo failed:', error);
                return false;
            }
        }

        return false;
    }, [undoStack]);

    // Check if undo is available
    const canUndo = undoStack.length > 0;

    // Get last action description
    const lastActionDescription = undoStack[0]?.description || '';

    // Clear undo stack
    const clearUndoStack = useCallback(() => {
        setUndoStack([]);
    }, []);

    const value = {
        undoStack,
        addUndoAction,
        performUndo,
        canUndo,
        lastActionDescription,
        clearUndoStack
    };

    return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
};

export const useUndo = () => {
    const context = useContext(UndoContext);
    if (!context) {
        throw new Error('useUndo must be used within UndoProvider');
    }
    return context;
};
