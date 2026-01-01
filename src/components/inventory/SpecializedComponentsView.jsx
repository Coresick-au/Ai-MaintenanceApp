import React, { useState } from 'react';
import { Icons } from '../../constants/icons';
import { WeighModuleManager } from './WeighModuleManager';
import { IdlerFrameManager } from './IdlerFrameManager';
import { BilletWeightManager } from './BilletWeightManager';
import { RollerManager } from './RollerManager';
import { SpeedSensorManager } from './SpeedSensorManager';
import { TMDFrameManager } from './TMDFrameManager';
import { WeigherModelConfig } from './WeigherModelConfig';
import { CostEstimator } from './CostEstimator';

export const SpecializedComponentsView = () => {
    const [activeTab, setActiveTab] = useState('weigh-modules');

    const tabs = [
        { id: 'weigh-modules', label: 'Weigh Modules', icon: Icons.Scale },
        { id: 'idler-frames', label: 'Idler Frames', icon: Icons.Frame },
        { id: 'billet-weights', label: 'Billet Weights', icon: Icons.Weight },
        { id: 'rollers', label: 'Rollers', icon: Icons.Circle },
        { id: 'speed-sensors', label: 'Spiral Cage Speed Sensors', icon: Icons.Activity },
        { id: 'tmd-frames', label: 'TMD Frames', icon: Icons.AlertOctagon },
        { id: 'estimator', label: 'Cost Estimator', icon: Icons.Calculator },
        { id: 'configuration', label: 'Configuration', icon: Icons.Settings }
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-6 py-4">
                <h1 className="text-2xl font-bold text-white">Specialized Components</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Historical cost tracking for conveyor components
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-6">
                <div className="flex gap-2">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'text-cyan-400 border-cyan-500'
                                    : 'text-slate-400 border-transparent hover:text-white hover:border-slate-600'
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto bg-slate-800 p-6">
                <div className="max-w-7xl mx-auto">
                    {activeTab === 'weigh-modules' && <WeighModuleManager />}
                    {activeTab === 'idler-frames' && <IdlerFrameManager />}
                    {activeTab === 'billet-weights' && <BilletWeightManager />}
                    {activeTab === 'rollers' && <RollerManager />}
                    {activeTab === 'speed-sensors' && <SpeedSensorManager />}
                    {activeTab === 'tmd-frames' && <TMDFrameManager />}
                    {activeTab === 'estimator' && <CostEstimator />}
                    {activeTab === 'configuration' && (
                        <div className="space-y-6">
                            <WeigherModelConfig />

                            {/* Belt Width Reference */}
                            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                                <h3 className="text-xl font-bold text-white mb-3">Standard Belt Widths</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Predefined belt widths available for selection (in millimeters)
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[600, 650, 750, 800, 900, 1000, 1050, 1200, 1350, 1400, 1500, 1600, 1800, 2000, 2200, 2400, 2500].map(width => (
                                        <span
                                            key={width}
                                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm font-mono"
                                        >
                                            {width}mm
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
