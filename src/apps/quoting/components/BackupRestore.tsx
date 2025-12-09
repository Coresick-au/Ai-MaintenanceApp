import { Download, Upload } from 'lucide-react';

interface BackupRestoreProps {
    exportState: () => void;
    importState: (fileContent: string) => boolean;
}

export default function BackupRestore({ exportState, importState }: BackupRestoreProps) {
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const success = importState(content);
            if (success) {
                alert('Data imported successfully!');
            } else {
                alert('Failed to import data. Please check the file format.');
            }
        };
        reader.readAsText(file);

        // Reset input so the same file can be selected again
        e.target.value = '';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Backup & Restore</h2>
                <p className="text-slate-400 mb-6">
                    Export your data to create a backup, or import a previously saved backup file.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Section */}
                    <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-600 p-3 rounded-lg">
                                <Download size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200">Export Data</h3>
                                <p className="text-sm text-slate-400">Download a backup file</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 mb-4">
                            Creates a JSON file containing all your quotes, customers, technicians, and default rates.
                        </p>
                        <button
                            onClick={exportState}
                            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <Download size={18} /> Export Backup
                        </button>
                    </div>

                    {/* Import Section */}
                    <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-600 p-3 rounded-lg">
                                <Upload size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200">Import Data</h3>
                                <p className="text-sm text-slate-400">Restore from backup file</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-300 mb-4">
                            Restores your data from a previously exported backup file. This will replace your current data.
                        </p>
                        <label className="w-full bg-green-600 text-white px-4 py-3 rounded-lg shadow hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium cursor-pointer">
                            <Upload size={18} /> Import Backup
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Warning */}
                <div className="mt-6 bg-amber-900/20 border border-amber-700 rounded-lg p-4">
                    <div className="flex gap-3">
                        <div className="text-amber-500 font-bold">⚠️</div>
                        <div>
                            <h4 className="font-semibold text-amber-300 mb-1">Important Notes</h4>
                            <ul className="text-sm text-amber-200/80 space-y-1 list-disc list-inside">
                                <li>Importing a backup will replace all your current data</li>
                                <li>Make sure to export a backup before importing to avoid data loss</li>
                                <li>Backup files are stored locally on your device</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
