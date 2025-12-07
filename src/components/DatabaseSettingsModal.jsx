import React, { useState, useEffect } from 'react';
import { Button } from './UIComponents';
import * as Icons from 'lucide-react';

export const DatabaseSettingsModal = ({ onClose, onDatabaseSelected }) => {
    const [dbPath, setDbPath] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Load current database path
        const loadDbPath = async () => {
            try {
                // Check if running in Electron
                if (!window.electronAPI) {
                    setError('Database settings only available in Electron mode');
                    setIsLoading(false);
                    return;
                }

                const path = await window.electronAPI.getDbPath();
                setDbPath(path);
            } catch (err) {
                console.error('Error loading database path:', err);
                setError('Failed to load database path');
            } finally {
                setIsLoading(false);
            }
        };

        loadDbPath();
    }, []);

    const handleSelectLocation = async () => {
        try {
            // Check if running in Electron
            if (!window.electronAPI) {
                setError('Database settings only available in Electron mode. Run: npm run electron:dev');
                return;
            }

            setError(null);
            const result = await window.electronAPI.selectDbPath();

            if (result.canceled) {
                return;
            }

            if (result.success) {
                setDbPath(result.path);
                if (onDatabaseSelected) {
                    onDatabaseSelected(result.path);
                }
            } else {
                setError(result.error || 'Failed to initialize database');
            }
        } catch (err) {
            console.error('Error selecting database location:', err);
            setError('Failed to select database location');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Icons.Database className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Database Settings</h2>
                            <p className="text-sm text-slate-400">Configure your database location</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <Icons.X size={20} className="text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Info Alert */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex gap-3">
                            <Icons.Info className="text-blue-400 flex-shrink-0" size={20} />
                            <div className="text-sm text-slate-300">
                                <p className="font-medium text-blue-400 mb-1">OneDrive Sync Support</p>
                                <p>Select a location in your OneDrive folder to enable multi-device sync. Make sure to close the app before switching computers.</p>
                            </div>
                        </div>
                    </div>

                    {/* Current Database Path */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Current Database Location
                        </label>
                        {isLoading ? (
                            <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                                <Icons.Loader2 className="animate-spin text-slate-400" size={16} />
                                <span className="text-sm text-slate-400">Loading...</span>
                            </div>
                        ) : dbPath ? (
                            <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                                <Icons.CheckCircle className="text-green-400 flex-shrink-0" size={16} />
                                <code className="text-sm text-slate-300 flex-1 truncate" title={dbPath}>
                                    {dbPath}
                                </code>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                <Icons.AlertCircle className="text-orange-400 flex-shrink-0" size={16} />
                                <span className="text-sm text-orange-300">No database configured</span>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <div className="flex gap-3">
                                <Icons.AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                                <div className="text-sm text-red-300">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Browse Button */}
                    <div className="flex gap-3">
                        <Button
                            variant="primary"
                            onClick={handleSelectLocation}
                            className="flex-1"
                        >
                            <Icons.FolderOpen size={16} />
                            {dbPath ? 'Change Location' : 'Select Location'}
                        </Button>
                        {dbPath && onClose && (
                            <Button
                                variant="secondary"
                                onClick={onClose}
                            >
                                Done
                            </Button>
                        )}
                    </div>

                    {/* Usage Guidelines */}
                    <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                            <Icons.Lightbulb size={16} className="text-yellow-400" />
                            Usage Guidelines
                        </h3>
                        <ul className="text-xs text-slate-400 space-y-1 ml-6 list-disc">
                            <li>Close the app on Computer A before opening on Computer B</li>
                            <li>Wait for OneDrive sync to complete before switching devices</li>
                            <li>Avoid having the app open on multiple computers simultaneously</li>
                            <li>The database file will be created as <code className="text-slate-300">maintenance.db</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
