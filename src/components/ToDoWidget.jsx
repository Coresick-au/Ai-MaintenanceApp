import React, { useState, useRef } from 'react';
import { Icons } from '../constants/icons';
import { useAuth } from '../context/AuthContext';

export const ToDoWidget = ({ todos, onAdd, onUpdate, onDelete }) => {
    const { userRole } = useAuth();
    const [newTodo, setNewTodo] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const textareaRef = useRef(null);

    // Only managers and admins can add/edit/delete comments
    const canManage = userRole === 'manager' || userRole === 'admin';

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
            completed: false, // Can be used as 'resolved' status
            timestamp: new Date().toISOString()
        });
        setNewTodo('');
        setIsAdding(false);
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                    <Icons.MessageCircle className="text-cyan-400" size={18} />
                    App Development Comments
                </h3>
                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                    {todos.length} Comments
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {todos.map(todo => (
                    <div key={todo.id} className="group relative bg-slate-900/40 hover:bg-slate-900/80 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-all">
                        <div className="flex gap-3 items-start">
                            {/* Status/Resolve Toggle - Only for Managers */}
                            {canManage && (
                                <button
                                    onClick={() => onUpdate(todo.id, { completed: !todo.completed })}
                                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${todo.completed
                                        ? 'bg-green-500/20 border-green-500 text-green-500'
                                        : 'border-slate-600 hover:border-cyan-500 text-transparent'
                                        }`}
                                    title={todo.completed ? "Mark as Unresolved" : "Mark as Resolved"}
                                >
                                    <Icons.CheckCircle size={14} />
                                </button>
                            )}

                            <textarea
                                className={`w-full bg-transparent resize-none outline-none text-sm transition-colors ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'
                                    } ${!canManage ? 'cursor-default' : ''}`}
                                value={todo.content}
                                rows={1}
                                readOnly={!canManage}
                                onChange={(e) => {
                                    if (canManage) adjustHeight(e.target);
                                }}
                                onBlur={(e) => {
                                    if (canManage && e.target.value !== todo.content) {
                                        onUpdate(todo.id, { content: e.target.value });
                                    }
                                }}
                                onFocus={(e) => {
                                    if (canManage) adjustHeight(e.target);
                                }}
                                ref={(el) => adjustHeight(el)}
                            />
                        </div>

                        {/* Delete Button - Only for Managers */}
                        {canManage && (
                            <button
                                onClick={() => {
                                    if (!window.confirm('Are you sure you want to delete this comment?')) return;
                                    onDelete(todo.id);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-all"
                                title="Delete Comment"
                            >
                                <Icons.X size={14} />
                            </button>
                        )}
                    </div>
                ))}

                {/* Add New Comment - Only for Managers */}
                {canManage ? (
                    isAdding ? (
                        <div className="bg-slate-900/80 rounded-lg p-3 border border-cyan-500/50 animate-in fade-in slide-in-from-bottom-2">
                            <textarea
                                ref={(el) => { textareaRef.current = el; if (el) el.focus(); }}
                                className="w-full bg-transparent resize-none outline-none text-sm text-white placeholder-slate-500"
                                placeholder="Write a comment..."
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
                                <button onClick={handleSubmit} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded font-bold">Post Comment</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-lg text-slate-500 hover:text-slate-300 text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <Icons.Plus size={16} /> Add Comment
                        </button>
                    )
                ) : (
                    /* Message for non-managers (optional, or just show nothing) */
                    todos.length === 0 && (
                        <div className="text-center text-slate-500 text-xs py-4 italic">
                            No comments to display.
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
