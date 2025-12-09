
import { Trash2 } from 'lucide-react';
import type { ExtraItem } from '../../types';

interface ExtrasProps {
    extras: ExtraItem[];
    isLocked: boolean;
    addExtra: () => void;
    updateExtra: (id: number, field: keyof ExtraItem, value: any) => void;
    removeExtra: (id: number) => void;
}

export default function Extras({ extras, isLocked, addExtra, updateExtra, removeExtra }: ExtrasProps) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold uppercase text-slate-100 tracking-wider">Extras & Expenses</h2>
                {!isLocked && (
                    <button
                        onClick={addExtra}
                        className="bg-gray-700 text-slate-300 px-3 py-1.5 rounded text-sm hover:bg-gray-600"
                    >
                        Add Item
                    </button>
                )}
            </div>
            {extras.map((item) => (
                <div key={item.id} className="flex gap-4 mb-2">
                    <input
                        disabled={isLocked}
                        placeholder="Description (e.g., Parts, Flights)"
                        className={`flex-1 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                        value={item.description}
                        onChange={(e) => updateExtra(item.id, 'description', e.target.value)}
                    />
                    <input
                        disabled={isLocked}
                        type="number"
                        placeholder="Cost"
                        className={`w-32 p-2 border border-gray-600 rounded bg-gray-700 text-slate-100 ${isLocked ? 'bg-gray-600 opacity-50' : ''}`}
                        value={item.cost}
                        onChange={(e) => updateExtra(item.id, 'cost', parseFloat(e.target.value) || 0)}
                    />
                    {!isLocked && (
                        <button
                            onClick={() => removeExtra(item.id)}
                            className="text-slate-400 hover:text-red-400"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
