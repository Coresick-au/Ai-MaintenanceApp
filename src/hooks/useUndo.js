import { useContext } from 'react';
import { UndoContext } from '../context/UndoContext';

export const useUndo = () => useContext(UndoContext);
