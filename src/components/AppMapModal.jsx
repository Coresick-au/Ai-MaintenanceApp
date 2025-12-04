import React, { useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import { Modal } from './UIComponents';
import { componentMapData } from '../data/componentMap';
import { useUIContext } from '../hooks/useUIContext';
import { useFilterContext } from '../hooks/useFilterContext';

export const AppMapModal = ({ isOpen, onClose }) => {
    const containerRef = useRef(null);
    const {
        setIsAddSiteModalOpen,
        setIsAssetModalOpen,
        setIsMasterListOpen,
        setIsAppHistoryOpen,
        setExpandedSection
    } = useUIContext();

    const { setActiveTab, setLocalViewMode } = useFilterContext();

    const handleNavigation = useCallback((nodeId) => {
        // Map node names to actions
        // This mapping needs to match the node names generated in generate-map.js
        // Currently generate-map.js uses the filename as the node name.

        switch (nodeId) {
            case 'AddSiteModal':
                setIsAddSiteModalOpen(true);
                break;
            case 'AddAssetModal':
                setIsAssetModalOpen(true);
                break;
            case 'MasterList':
                setIsMasterListOpen(true);
                break;
            case 'AppHistory':
                setIsAppHistoryOpen(true);
                break;
            case 'LocalView':
                setActiveTab('service');
                setLocalViewMode('list');
                setExpandedSection('local');
                break;
            case 'AnalyticsView':
                setActiveTab('service');
                setLocalViewMode('analytics');
                setExpandedSection('local');
                break;
            case 'TimelineView':
                setActiveTab('service');
                setLocalViewMode('timeline');
                setExpandedSection('local');
                break;
            default:
                console.log('Unknown node:', nodeId);
                break;
        }
        onClose();
    }, [setIsAddSiteModalOpen, setIsAssetModalOpen, setIsMasterListOpen, setIsAppHistoryOpen, setActiveTab, setLocalViewMode, setExpandedSection, onClose]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            mermaid.initialize({
                startOnLoad: true,
                theme: 'dark',
                securityLevel: 'loose',
            });

            // Render the graph
            mermaid.render('mermaid-graph', componentMapData).then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;

                    // Bind click events manually since Mermaid's click interaction can be tricky in React
                    // We defined `click NodeName call handleNodeClick("NodeName")` in the graph
                    // So we need to expose handleNodeClick globally or attach listeners to nodes

                    // Better approach: Attach listeners to the SVG nodes directly
                    // The nodes will have IDs like "flowchart-NodeName-..."

                    // Let's define the global handler that Mermaid tries to call
                    window.handleNodeClick = (nodeId) => {
                        console.log("Clicked node:", nodeId);
                        handleNavigation(nodeId);
                    };
                }
            });
        }
    }, [isOpen, handleNavigation]);

    if (!isOpen) return null;

    return (
        <Modal title="Application Component Map" onClose={onClose} size="max">
            <div className="flex flex-col h-full">
                <div className="bg-slate-800 p-4 rounded mb-4 text-sm text-slate-400">
                    <p>Click on a component node to navigate to that section of the application.</p>
                </div>
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-slate-900 rounded border border-slate-700 p-4 flex justify-center items-start"
                >
                    {/* Mermaid SVG will be injected here */}
                    <div className="text-slate-500 animate-pulse">Loading Map...</div>
                </div>
            </div>
        </Modal>
    );
};
