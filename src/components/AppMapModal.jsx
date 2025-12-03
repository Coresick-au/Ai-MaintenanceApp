import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Modal } from './UIComponents';
import { componentMapData } from '../data/componentMap';
import { useUIContext } from '../context/UIContext';
import { useSiteContext } from '../context/SiteContext';
import { useFilterContext } from '../context/FilterContext';

export const AppMapModal = ({ isOpen, onClose }) => {
    const containerRef = useRef(null);
    const {
        setIsAddSiteModalOpen,
        setIsAssetModalOpen,
        setIsMasterListOpen,
        setIsAppHistoryOpen,
        setIsHelpModalOpen,
        setViewAnalyticsAsset,
        setExpandedSection
    } = useUIContext();

    const { setActiveTab, setLocalViewMode } = useFilterContext();

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
    }, [isOpen]);

    const handleNavigation = (nodeId) => {
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
            case 'MasterListModal':
                setIsMasterListOpen(true);
                break;
            case 'AppHistoryModal':
                setIsAppHistoryOpen(true);
                break;
            case 'AssetTimeline':
                setLocalViewMode('timeline');
                setExpandedSection('timeline');
                break;
            case 'AssetAnalytics':
                // This one is tricky as it usually needs a specific asset. 
                // We can't easily open it without context.
                alert("Select an asset first to view analytics.");
                return; // Don't close modal
            case 'SiteIssueTracker':
                setActiveTab('issues');
                break;
            // Add more mappings as needed
            default:
                console.log("No navigation action for:", nodeId);
                return; // Don't close modal if no action
        }
        onClose();
    };

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
