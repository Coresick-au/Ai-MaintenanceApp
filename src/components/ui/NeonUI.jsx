import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export function PageShell({ title, right, children }) {
    return (
        <div className="min-h-screen bg-[#0a1628] text-slate-200 relative">
            {/* subtle grid overlay */}
            <div
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                }}
            />
            {/* radial edge darken */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(circle at 50% 20%, rgba(14,165,233,0.10), transparent 55%), radial-gradient(circle at 50% 60%, rgba(15,23,42,0.0), rgba(10,22,40,0.95) 70%)",
                }}
            />

            <div className="relative px-6 py-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
                        <p className="text-sm text-slate-400">
                            Accurate Industries job sheet
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">{right}</div>
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
                "rounded-xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-sm shadow-sm",
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}

export function NeonButton({
    children,
    variant = "sky", // sky | cyan | danger | slate
    className = "",
    ...props
}) {
    const palette = {
        sky: "text-sky-200 border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 hover:shadow-[0_0_15px_rgba(14,165,233,0.65)]",
        cyan: "text-cyan-200 border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.65)]",
        danger:
            "text-red-200 border-red-500/50 bg-red-500/10 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(220,38,38,0.65)]",
        slate:
            "text-slate-200 border-slate-600/60 bg-slate-500/10 hover:bg-slate-500/15 hover:shadow-[0_0_15px_rgba(148,163,184,0.35)]",
    };

    return (
        <button
            className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 border backdrop-blur-sm",
                "transition active:scale-95 hover:brightness-110",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                palette[variant],
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
                "w-full rounded-lg bg-slate-900 border border-slate-600/70 px-3 py-2 text-sm",
                "text-slate-200 placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500",
                "transition",
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
                "w-full rounded-lg bg-slate-900 border border-slate-600/70 px-3 py-2 text-sm",
                "text-slate-200",
                "focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500",
                "transition",
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
                "w-full rounded-lg bg-slate-900 border border-slate-600/70 px-3 py-2 text-sm",
                "text-slate-200 placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500",
                "transition min-h-[80px]",
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
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Content */}
            <Card className="relative w-full max-w-4xl bg-slate-900 border-slate-700 shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-slate-100">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-800 rounded-md">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
                        {footer}
                    </div>
                )}
            </Card>
        </div>
    );
}

export function StatusBadge({ tone = "slate", children }) {
    const tones = {
        success: "bg-emerald-900/50 text-emerald-200 border-emerald-800",
        warning: "bg-amber-900/50 text-amber-200 border-amber-800",
        danger: "bg-red-900/50 text-red-200 border-red-800",
        info: "bg-sky-900/50 text-sky-200 border-sky-800",
        slate: "bg-slate-800/60 text-slate-200 border-slate-700",
    };
    return (
        <span
            className={[
                "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
                tones[tone] || tones.slate,
            ].join(" ")}
        >
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
