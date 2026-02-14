import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    defaultCollapsed?: boolean;
    collapsedSummary?: React.ReactNode;
    borderColor?: string;
    children: React.ReactNode;
}

export default function CollapsibleSection({
    title,
    icon,
    badge,
    defaultCollapsed = false,
    collapsedSummary,
    borderColor = 'border-gray-700',
    children
}: CollapsibleSectionProps) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    return (
        <div className={`bg-gray-800 rounded-lg shadow-sm border ${borderColor} overflow-hidden`}>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between p-6 pb-4 text-left hover:bg-gray-750 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">{title}</h2>
                    {badge}
                </div>
                <div className="flex items-center gap-3">
                    {collapsed && collapsedSummary && (
                        <span className="text-sm text-slate-400">{collapsedSummary}</span>
                    )}
                    {collapsed ? (
                        <ChevronDown size={20} className="text-slate-400" />
                    ) : (
                        <ChevronUp size={20} className="text-slate-400" />
                    )}
                </div>
            </button>
            <div className={collapsed ? 'hidden' : 'px-6 pb-6'}>
                {children}
            </div>
        </div>
    );
}
