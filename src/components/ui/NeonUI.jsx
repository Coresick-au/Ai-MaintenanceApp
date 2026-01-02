import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft } from "lucide-react";

export function PageShell({ title, subtitle, right, children, onBack }) {
    return (
        <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
            <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="group flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-active)] transition-all"
                                title="Go back"
                            >
                                <ChevronLeft size={20} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{title}</h1>
                            {subtitle && (
                                <p className="text-sm text-[var(--text-muted)]">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end items-center">{right}</div>
                </div>

                {children}
            </div>
        </div>
    );
}

export function Card({ className = "", children }) {
    return (
        <div
            className={[
                "rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]",
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}

export function NeonButton({
    children,
    variant = "primary", // primary | secondary | danger
    className = "",
    ...props
}) {
    const palette = {
        primary: "bg-[var(--accent)] text-slate-900 hover:bg-[var(--accent-hover)] font-semibold",
        secondary: "bg-white/5 text-white border border-[var(--border-default)] hover:bg-white/10",
        danger: "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30",
    };

    return (
        <button
            className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                "transition-colors duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                palette[variant] || palette.secondary,
                className,
            ].join(" ")}
            {...props}
        >
            {children}
        </button>
    );
}

export function TextInput({ className = "", ...props }) {
    return (
        <input
            className={[
                "w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-sm",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]",
                "transition-colors",
                className,
            ].join(" ")}
            {...props}
        />
    );
}

export function Select({ className = "", children, ...props }) {
    return (
        <select
            className={[
                "w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-sm",
                "text-[var(--text-primary)]",
                "focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]",
                "transition-colors",
                className,
            ].join(" ")}
            {...props}
        >
            {children}
        </select>
    );
}

export function TextArea({ className = "", ...props }) {
    return (
        <textarea
            className={[
                "w-full rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-2 text-sm",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)]",
                "transition-colors min-h-[80px]",
                className,
            ].join(" ")}
            {...props}
        />
    );
}

export function Modal({ isOpen, onClose, title, children, footer }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Content */}
            <Card className="relative w-full max-w-4xl bg-[var(--bg-surface)] shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition p-1 hover:bg-[var(--bg-active)] rounded-md">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="p-4 border-t border-[var(--border-default)] flex justify-end gap-3 bg-[var(--bg-surface)]">
                        {footer}
                    </div>
                )}
            </Card>
        </div>
    );
}

export function StatusBadge({ tone = "grey", children, showIcon = true }) {
    const tones = {
        success: "bg-green-500/20 text-green-300 border-green-400/40",
        warning: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
        danger: "bg-red-500/20 text-red-300 border-red-400/40",
        info: "bg-blue-500/20 text-blue-300 border-blue-400/40",
        orange: "bg-orange-500/20 text-orange-300 border-orange-400/40",
        grey: "bg-slate-500/20 text-slate-300 border-slate-400/40",
    };

    // Accessible icons for each status type
    const icons = {
        success: "✓",
        warning: "⚠",
        danger: "✕",
        info: "●",
        orange: "◐",
        grey: "○",
    };

    return (
        <span
            className={[
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                tones[tone] || tones.grey,
            ].join(" ")}
            role="status"
            aria-label={`Status: ${children}`}
        >
            {showIcon && <span aria-hidden="true">{icons[tone] || icons.grey}</span>}
            {children}
        </span>
    );
}

/**
 * Hold-to-confirm (3s) button with circular SVG progress.
 * Use for delete / reset.
 */
export function HoldToConfirmButton({
    seconds = 3,
    onConfirm,
    children,
    variant = "danger",
    className = "",
    disabled,
}) {
    const [holding, setHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const rafRef = useRef(null);
    const startRef = useRef(null);

    const circumference = useMemo(() => 2 * Math.PI * 10, []);

    function stop() {
        setHolding(false);
        setProgress(0);
        startRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
    }

    function tick(ts) {
        if (!startRef.current) startRef.current = ts;
        const elapsed = (ts - startRef.current) / 1000;
        const p = Math.min(1, elapsed / seconds);
        setProgress(p);

        if (p >= 1) {
            stop();
            onConfirm?.();
            return;
        }
        rafRef.current = requestAnimationFrame(tick);
    }

    function start() {
        if (disabled) return;
        setHolding(true);
        rafRef.current = requestAnimationFrame(tick);
    }

    useEffect(() => () => stop(), []);

    const dashOffset = circumference * (1 - progress);

    return (
        <NeonButton
            variant={variant}
            className={["relative", className].join(" ")}
            onMouseDown={start}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={start}
            onTouchEnd={stop}
            disabled={disabled}
            type="button"
            title={`Hold for ${seconds}s to confirm`}
        >
            <span className="relative flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5">
                    <svg width="22" height="22" viewBox="0 0 24 24">
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="transparent"
                            stroke="rgba(148,163,184,0.35)"
                            strokeWidth="2"
                        />
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            fill="transparent"
                            stroke="rgba(6,182,212,0.95)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            style={{ transition: holding ? "none" : "stroke-dashoffset 150ms" }}
                            transform="rotate(-90 12 12)"
                        />
                    </svg>
                </span>
                {children}
            </span>
        </NeonButton>
    );
}
