import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Unified BackButton component for consistent navigation across all apps.
 * Uses AIMM Cyan Neon styling with top-left arrow design.
 * 
 * @param {string} label - Button label text (default: "Back to Portal")
 * @param {function} onClick - Click handler function
 */
const BackButton = ({ label = "Back to Portal", onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group flex items-center gap-3 px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-all duration-300"
            title={label}
        >
            <div className="p-2 rounded-full border border-cyan-500/30 group-hover:border-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all">
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="font-medium tracking-wide uppercase text-xs sm:text-sm">
                {label}
            </span>
        </button>
    );
};

export default BackButton;
