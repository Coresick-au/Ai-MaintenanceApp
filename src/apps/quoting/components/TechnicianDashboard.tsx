
import { useState } from 'react';
import { Plus, Trash2, User } from 'lucide-react';

interface TechnicianDashboardProps {
    savedTechnicians: string[];
    saveTechnician: (name: string) => void;
    deleteTechnician: (name: string) => void;
}

export default function TechnicianDashboard({ savedTechnicians, saveTechnician, deleteTechnician }: TechnicianDashboardProps) {
    const [newName, setNewName] = useState('');

    const handleAdd = () => {
        if (!newName.trim()) return;
        saveTechnician(newName.trim());
        setNewName('');
    };

    const handleDelete = (name: string) => {
        if (confirm(`Are you sure you want to delete technician "${name}"?`)) {
            deleteTechnician(name);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar List */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-600 flex justify-between items-center bg-gray-700 rounded-t-lg">
                    <h3 className="font-semibold text-slate-200">Technicians</h3>
                </div>

                <div className="p-4 border-b border-gray-600">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="New Technician Name"
                            className="flex-1 border border-gray-600 rounded bg-gray-700 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            className="bg-primary-600 text-white p-2 rounded hover:bg-primary-700 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {savedTechnicians.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No technicians saved yet.
                        </div>
                    ) : (
                        savedTechnicians.map((tech) => (
                            <div
                                key={tech}
                                className="w-full text-left px-4 py-3 rounded-md flex items-center justify-between group hover:bg-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-slate-300">
                                        <User size={16} />
                                    </div>
                                    <span className="font-medium text-slate-200">{tech}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(tech)}
                                    className="text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    title="Delete Technician"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info Area */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-primary-900/20 border border-primary-700 rounded-lg p-6 text-primary-200">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <User size={20} />
                        Technician Management
                    </h3>
                    <p className="text-sm opacity-90">
                        Add technicians here to make them available in the dropdown list when creating quotes.
                        Technicians are saved locally on this device.
                    </p>
                </div>
            </div>
        </div>
    );
}
