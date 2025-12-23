import { XCircle, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
    /** Dialog title */
    title: string;

    /** Dialog message/description */
    message: string;

    /** Type of dialog (affects styling and buttons) */
    type?: 'confirm' | 'warning';

    /** Text for the confirm button (default: "Confirm") */
    confirmText?: string;

    /** Text for the cancel button (default: "Cancel") */
    cancelText?: string;

    /** Callback when user confirms */
    onConfirm?: () => void;

    /** Callback when user cancels or closes */
    onCancel: () => void;

    /** Loading state (disables buttons) */
    loading?: boolean;
}

/**
 * Reusable Confirmation Dialog Component
 * Used for destructive actions and user confirmations.
 */
export function ConfirmationDialog({
    title,
    message,
    type = 'confirm',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    loading = false
}: ConfirmationDialogProps) {
    const isWarningOnly = type === 'warning' && !onConfirm;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCancel}>
            <div
                className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start gap-3 p-6 pb-4">
                    {type === 'warning' ? (
                        <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                    ) : (
                        <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 pb-6">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-900/50 rounded-b-lg">
                    {!isWarningOnly && (
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>
                    )}

                    {isWarningOnly ? (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                        >
                            OK
                        </button>
                    ) : onConfirm && (
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
