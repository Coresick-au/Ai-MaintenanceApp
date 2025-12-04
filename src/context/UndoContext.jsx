// src/context/UndoContext.jsx
import React, { createContext, useState, useCallback } from 'react';
import { MAX_UNDO_STACK_SIZE } from '../constants/uiConstants';

const UndoContext = createContext();

export const UndoProvider = ({ children }) => {
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // Track dirty state (unsaved changes)
    const [isDirty, setIsDirty] = useState(false);

    // Add an action to the undo stack
    const addUndoAction = useCallback((action) => {
        setIsDirty(true);
        setUndoStack((prev) => {
            const newStack = [action, ...prev].slice(0, MAX_UNDO_STACK_SIZE);
            return newStack;
        });
        // Clear redo stack when a new action is performed
        setRedoStack([]);
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
                // Move the action to redo stack
                setRedoStack((prev) => [lastAction, ...prev].slice(0, MAX_UNDO_STACK_SIZE));
                // Note: We don't automatically clear dirty on undo, as we might be undoing to a dirty state.
                // But we definitely changed something, so it's still dirty unless we track "saved state index".
                // For now, assume any change (do or undo) keeps it dirty until explicit save.
                setIsDirty(true);
                return true;
            } catch (error) {
                console.error('Undo failed:', error);
                return false;
            }
        }

        return false;
    }, [undoStack]);

    // Perform redo
    const performRedo = useCallback(() => {
        if (redoStack.length === 0) return false;

        const [lastRedoAction, ...rest] = redoStack;

        // Execute the redo function (which is the original action)
        if (lastRedoAction.redo && typeof lastRedoAction.redo === 'function') {
            try {
                lastRedoAction.redo();
                setRedoStack(rest);
                // Move the action back to undo stack
                setUndoStack((prev) => [lastRedoAction, ...prev].slice(0, MAX_UNDO_STACK_SIZE));
                setIsDirty(true);
                return true;
            } catch (error) {
                console.error('Redo failed:', error);
                return false;
            }
        }

        return false;
    }, [redoStack]);

    // Check if undo is available
    const canUndo = undoStack.length > 0;

    // Check if redo is available
    const canRedo = redoStack.length > 0;

    // Get last action description
    const lastActionDescription = undoStack[0]?.description || '';

    // Get last redo action description
    const lastRedoActionDescription = redoStack[0]?.description || '';

    // Clear undo stack
    const clearUndoStack = useCallback(() => {
        setUndoStack([]);
        setRedoStack([]);
    }, []);

    // Clear dirty flag
    const clearDirty = useCallback(() => {
        setIsDirty(false);
    }, []);

    const value = {
        undoStack,
        redoStack,
        addUndoAction,
        performUndo,
        performRedo,
        canUndo,
        canRedo,
        isDirty, // Expose isDirty
        lastActionDescription,
        lastRedoActionDescription,
        clearUndoStack,
        clearDirty // Expose clearDirty
    };

    return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
};
