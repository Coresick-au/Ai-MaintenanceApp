import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants/icons';

export const ToDoWidget = ({ todos, onAdd, onUpdate, onDelete }) => {
    const [newTodo, setNewTodo] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const textareaRef = useRef(null);

    // Auto-resize textarea
    const adjustHeight = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    const handleSubmit = () => {
        if (!newTodo.trim()) {
            setIsAdding(false);
            return;
        }
        onAdd({
            content: newTodo,
            completed: false,
            timestamp: new Date().toISOString()
        });
        setNewTodo('');
        setIsAdding(false);
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                    <Icons.CheckCircle className="text-cyan-400" size={18} />
                    App Development Tasks
                </h3>
                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    {todos.filter(t => !t.completed).length} Pending
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {todos.map(todo => (
                    <div key={todo.id} className="group relative bg-slate-900/40 hover:bg-slate-900/80 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-all">
                        <div className="flex gap-3 items-start">
                            <button
                                onClick={() => onUpdate(todo.id, { completed: !todo.completed })}
                                className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${todo.completed
                                        ? 'bg-green-500/20 border-green-500 text-green-500'
                                        : 'border-slate-600 hover:border-cyan-500 text-transparent'
                                    }`}
                            >
                                <Icons.CheckCircle size={14} />
                            </button>

                            <textarea
                                className={`w-full bg-transparent resize-none outline-none text-sm transition-colors ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'
                                    }`}
                                value={todo.content}
                                rows={1}
                                onChange={(e) => {
                                    adjustHeight(e.target);
                                }}
                                onBlur={(e) => {
                                    if (e.target.value !== todo.content) {
                                        onUpdate(todo.id, { content: e.target.value });
                                    }
                                }}
                                onFocus={(e) => adjustHeight(e.target)}
                                ref={(el) => adjustHeight(el)}
                            />
                        </div>

                        <button
                            onClick={() => onDelete(todo.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-all"
                            title="Delete Task"
                        >
                            <Icons.X size={14} />
                        </button>
                    </div>
                ))}

                {isAdding ? (
                    <div className="bg-slate-900/80 rounded-lg p-3 border border-cyan-500/50 animate-in fade-in slide-in-from-bottom-2">
                        <textarea
                            ref={(el) => { textareaRef.current = el; if (el) el.focus(); }}
                            className="w-full bg-transparent resize-none outline-none text-sm text-white placeholder-slate-500"
                            placeholder="What needs to be done?"
                            value={newTodo}
                            onChange={(e) => {
                                setNewTodo(e.target.value);
                                adjustHeight(e.target);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                                if (e.key === 'Escape') setIsAdding(false);
                            }}
                            rows={1}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsAdding(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1">Cancel</button>
                            <button onClick={handleSubmit} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded font-bold">Add Task</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-lg text-slate-500 hover:text-slate-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                        <Icons.Plus size={16} /> Add New Task
                    </button>
                )}
            </div>
        </div>
    );
};
