import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-green-900/90', border: 'border-green-500', icon: '✓' },
    error: { bg: 'bg-red-900/90', border: 'border-red-500', icon: '✕' },
    warning: { bg: 'bg-amber-900/90', border: 'border-amber-500', icon: '⚠' },
    info: { bg: 'bg-blue-900/90', border: 'border-blue-500', icon: 'ℹ' },
};

const ICON_COLOR: Record<ToastType, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
};

let nextId = 0;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const cfg = TOAST_CONFIG[toast.type];

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 ${cfg.border} ${cfg.bg} text-white shadow-lg backdrop-blur-sm animate-slide-in-right`}
            role="alert"
        >
            <span className={`text-lg font-bold ${ICON_COLOR[toast.type]}`}>{cfg.icon}</span>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button onClick={onDismiss} className="text-white/60 hover:text-white ml-2 text-sm">✕</button>
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = nextId++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast container - right side */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
            `}</style>
        </ToastContext.Provider>
    );
}
