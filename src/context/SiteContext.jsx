import React, { useState, useEffect, useMemo } from 'react';
import { useUndo } from '../hooks/useUndo';
import { recalculateRow, generateSampleSite } from '../data/mockData';
import { safelyLoadData, loadSitesFromStorage } from '../utils/dataUtils';
import { SiteContext } from './SiteContext.context';

export { SiteContext };
export const SiteProvider = ({ children }) => {
    const { addUndoAction, clearDirty } = useUndo();
    const [sites, setSites] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // --- PERSISTENCE ---
    useEffect(() => {
        // Load Sites asynchronously (no longer load selectedSiteId)
        const loadData = async () => {
            const loadedSites = loadSitesFromStorage();
            
            // Use setTimeout to defer state updates and avoid cascading renders
            setTimeout(() => {
                setSites(loadedSites);
                setIsDataLoaded(true);
            }, 0);
        };
        
        loadData();
    }, []);

    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('app_data', JSON.stringify(sites));
            clearDirty();
        }
    }, [sites, isDataLoaded, clearDirty]);

    // --- DERIVED STATE ---
    const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);
    const currentServiceData = selectedSite ? selectedSite.serviceData : [];
    const currentRollerData = selectedSite ? selectedSite.rollerData : [];
    const currentSpecData = useMemo(() => selectedSite ? (selectedSite.specData || []) : [], [selectedSite]);

    // --- ACTIONS ---
    const updateSiteData = (siteId, updates, description = 'Update Site Data') => {
        console.log(`[SiteContext] Updating site ${siteId}:`, description);

        const site = sites.find(s => s.id === siteId);
        if (!site) {
            console.error(`[SiteContext] Update failed. Site ID ${siteId} not found.`);
            return;
        }

        const newSiteState = { ...site, ...updates };

        if (site) {
            addUndoAction({
                description: description,
                undo: () => setSites(current => current.map(s => s.id === siteId ? site : s)),
                redo: () => setSites(current => current.map(s => s.id === siteId ? newSiteState : s))
            });
        }
        setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...updates } : s));
    };

    const handleAddSite = (siteForm, noteInput) => {
        if (!siteForm.name) return;
        const initialNotes = noteInput.content ? [{ id: `n-${Date.now()}`, content: noteInput.content, author: noteInput.author || 'Admin', timestamp: new Date().toISOString() }] : [];
        const newSite = {
            id: `site-${Date.now()}`,
            name: siteForm.name,
            customer: siteForm.customer,
            location: siteForm.location,
            contactName: siteForm.contactName,
            contactEmail: siteForm.contactEmail,
            contactPosition: siteForm.contactPosition,
            contactPhone1: siteForm.contactPhone1,
            contactPhone2: siteForm.contactPhone2,
            active: true,
            notes: initialNotes,
            logo: siteForm.logo,
            type: siteForm.type || 'Mine',
            typeDetail: siteForm.typeDetail || '',
            serviceData: [],
            rollerData: [],
            specData: []
        };

        addUndoAction({
            description: `Add Site: ${newSite.name}`,
            undo: () => setSites(prev => prev.filter(s => s.id !== newSite.id)),
            redo: () => setSites(prev => [...prev, newSite])
        });

        setSites([...sites, newSite]);
        return newSite;
    };

    const handleGenerateSample = () => {
        const sample = generateSampleSite();
        setSites([sample, ...sites]);
    };

    const handleDeleteSite = (siteId) => {
        const siteToDelete = sites.find(s => s.id === siteId);
        if (siteToDelete) {
            addUndoAction({
                description: `Delete Site: ${siteToDelete.name}`,
                undo: () => setSites(prev => [...prev, siteToDelete])
            });
        }
        setSites(sites.filter(s => s.id !== siteId));
        if (selectedSiteId === siteId) {
            setSelectedSiteId(null);
            localStorage.removeItem('selected_site_id');
        }
    };

    const handleUpdateSiteInfo = (siteForm) => {
        updateSiteData(siteForm.id, {
            name: siteForm.name,
            customer: siteForm.customer,
            location: siteForm.location,
            contactName: siteForm.contactName,
            contactEmail: siteForm.contactEmail,
            contactPosition: siteForm.contactPosition,
            contactPhone1: siteForm.contactPhone1,
            contactPhone2: siteForm.contactPhone2,

            notes: siteForm.notes,
            logo: siteForm.logo,
            type: siteForm.type,
            typeDetail: siteForm.typeDetail
        }, 'Update Site Info');
    };

    const toggleSiteStatus = (site) => {
        const isActivating = site.active === false;
        const originalSite = sites.find(s => s.id === site.id);

        if (originalSite) {
            addUndoAction({
                description: `Toggle Site Status: ${site.name}`,
                undo: () => setSites(current => current.map(s => s.id === site.id ? originalSite : s))
            });
        }

        const updatedSites = sites.map(s => {
            if (s.id === site.id) {
                const newNote = {
                    id: `n-${Date.now()}`,
                    content: isActivating ? 'Site Re-activated' : 'Site Archived',
                    author: 'System',
                    timestamp: new Date().toISOString()
                };
                return { ...s, active: isActivating, notes: [...s.notes, newNote] };
            }
            return s;
        });
        setSites(updatedSites);
        return isActivating;
    };

    const handleAddIssue = (siteId, newIssue) => {
        setSites(prevSites =>
            prevSites.map(site => {
                if (site.id === siteId) {
                    const selectedAsset = [...(site.serviceData || []), ...(site.rollerData || [])].find(
                        asset => asset.id === newIssue.assetId
                    );
                    return {
                        ...site,
                        issues: [
                            ...(site.issues || []),
                            {
                                ...newIssue,
                                assetName: selectedAsset ? `${selectedAsset.name} (${selectedAsset.code})` : 'N/A',
                            },
                        ],
                    };
                }
                return site;
            })
        );
    };

    const handleDeleteIssue = (siteId, issueId) => {
        setSites(prevSites => prevSites.map(site => {
            if (site.id === siteId) {
                return {
                    ...site,
                    issues: (site.issues || []).filter(i => i.id !== issueId)
                };
            }
            return site;
        }));
    };

    const handleToggleIssueStatus = (siteId, issueId) => {
        setSites(prevSites =>
            prevSites.map(site =>
                site.id === siteId ? {
                    ...site,
                    issues: (site.issues || []).map(issue =>
                        issue.id === issueId ? {
                            ...issue,
                            status: issue.status === 'Completed' ? 'Open' : 'Completed',
                            completedAt: issue.status === 'Completed' ? null : new Date().toISOString(),
                        } : issue
                    ),
                } : site
            )
        );
    };

    const handleUpdateIssue = (siteId, issueId, updatedFields) => {
        setSites(prevSites =>
            prevSites.map(site => {
                if (site.id === siteId) {
                    const updatedIssues = (site.issues || []).map(issue => {
                        if (issue.id === issueId) {
                            const selectedAsset = updatedFields.assetId
                                ? [...(site.serviceData || []), ...(site.rollerData || [])].find(asset => asset.id === updatedFields.assetId)
                                : null;
                            const assetName = selectedAsset ? `${selectedAsset.name} (${selectedAsset.code})` : null;

                            return { ...issue, ...updatedFields, assetName: assetName };
                        }
                        return issue;
                    });
                    return { ...site, issues: updatedIssues };
                }
                return site;
            })
        );
    };

    const handleCopyIssue = (issue) => {
        const issueText = `Issue: ${issue.title}\nDescription: ${issue.description || 'N/A'}\nAsset: ${issue.assetName || 'N/A'}\nPriority: ${issue.priority || 'N/A'}\nStatus: ${issue.status}`;
        navigator.clipboard.writeText(issueText).then(() => {
            alert('Issue details copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy issue details.');
        });
    };

    const handleAddAsset = (newAsset, activeTab) => {
        console.log("Attempting to add asset:", newAsset);

        if (!selectedSiteId) {
            console.error("[SiteContext] Cannot add asset: No Site Selected.");
            return;
        }

        if (!newAsset.name || !newAsset.code) {
            console.error("[SiteContext] Cannot add asset: Missing Name or Code.", newAsset);
            return;
        }

        try {
            const baseId = Math.random().toString(36).substr(2, 9);
            const historyEntry = { date: new Date().toISOString(), action: 'Asset Created', user: 'User' };

            const serviceItem = recalculateRow({
                id: `s-${baseId}`,
                active: true,
                ...newAsset,
                frequency: activeTab === 'service' && newAsset.frequency ? parseInt(newAsset.frequency) : 3,
                dueDate: '',
                remaining: 0,
                history: [historyEntry]
            });

            const rollerItem = recalculateRow({
                id: `r-${baseId}`,
                active: true,
                ...newAsset,
                frequency: activeTab === 'roller' && newAsset.frequency ? parseInt(newAsset.frequency) : 12,
                dueDate: '',
                remaining: 0,
                history: [historyEntry]
            });

            updateSiteData(selectedSiteId, {
                serviceData: [serviceItem, ...currentServiceData],
                rollerData: [rollerItem, ...currentRollerData]
            }, 'Add Asset');

        } catch (error) {
            console.error("[SiteContext] Error creating asset row:", error);
        }
    };

    const handleDeleteAsset = (editingAsset) => {
        if (!editingAsset) return;
        const idParts = editingAsset.id.split('-');
        const baseId = idParts.length > 1 ? idParts[1] : null;
        let newServiceData = currentServiceData.filter(i => i.id !== editingAsset.id);
        let newRollerData = currentRollerData.filter(i => i.id !== editingAsset.id);
        if (baseId) {
            newServiceData = newServiceData.filter(i => i.id !== `s-${baseId}`);
            newRollerData = newRollerData.filter(i => i.id !== `r-${baseId}`);
        }
        updateSiteData(selectedSiteId, { serviceData: newServiceData, rollerData: newRollerData }, 'Delete Asset');
    };

    const handleSaveEditedAsset = (editingAsset, activeTab) => {
        if (!editingAsset) return;
        
        // 1. Calculate updates for the asset being edited
        const updatedPrimary = recalculateRow(editingAsset);
        const newHistory = { date: new Date().toISOString(), action: 'Details Updated', user: 'User' };
        updatedPrimary.history = [...(updatedPrimary.history || []), newHistory];

        // 2. Prepare copies of both lists
        let newServiceData = [...currentServiceData];
        let newRollerData = [...currentRollerData];

        // 3. Update the list where the edit happened
        if (activeTab === 'service') {
            newServiceData = newServiceData.map(i => i.id === updatedPrimary.id ? updatedPrimary : i);
        } else {
            newRollerData = newRollerData.map(i => i.id === updatedPrimary.id ? updatedPrimary : i);
        }

        // 4. SYNC SHARED FIELDS to the counterpart list
        const idParts = editingAsset.id.split('-');
        const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

        if (baseId) {
            const counterpartPrefix = activeTab === 'service' ? 'r-' : 's-';
            const counterpartId = `${counterpartPrefix}${baseId}`;
            
            // Define which fields should stay in sync across both views
            const sharedUpdates = {
                name: updatedPrimary.name,
                code: updatedPrimary.code,
                weigher: updatedPrimary.weigher,
                // Note: We DO NOT sync 'frequency', 'lastCal', 'dueDate' etc. as those might differ per schedule
            };

            const updateCounterpartList = (list) => list.map(item => {
                if (item.id === counterpartId) {
                    return { 
                        ...item, 
                        ...sharedUpdates, 
                        history: [...(item.history || []), newHistory] 
                    };
                }
                return item;
            });

            if (activeTab === 'service') {
                newRollerData = updateCounterpartList(newRollerData);
            } else {
                newServiceData = updateCounterpartList(newServiceData);
            }
        }

        // 5. Save BOTH lists to ensuring they stay in sync
        updateSiteData(selectedSiteId, { 
            serviceData: newServiceData, 
            rollerData: newRollerData 
        }, 'Update Asset Details');
    };

    const handleSaveEditedSpecs = (editingSpecs) => {
        if (!editingSpecs) return;
        const newHistory = { date: new Date().toISOString(), action: editingSpecs.id ? 'Specification Updated' : 'Specification Created', user: 'User' };
        const specToSave = { ...editingSpecs, history: [...(editingSpecs.history || []), newHistory] };
        if (editingSpecs.id) {
            updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === editingSpecs.id ? specToSave : s) }, 'Update Specs');
        } else {
            updateSiteData(selectedSiteId, { specData: [...currentSpecData, { ...specToSave, id: Math.random().toString(36).substr(2, 9), notes: editingSpecs.notes || [] }] }, 'Add Specs');
        }
    };

    const handleInlineUpdate = (id, field, val, activeTab) => {
        // Fields that should NOT match between lists (keep independent)
        const independentFields = ['lastCal', 'frequency', 'dueDate', 'remaining'];
        const isIndependentField = independentFields.includes(field);

        // 1. Update the list the user is currently interacting with
        const currentList = activeTab === 'service' ? currentServiceData : currentRollerData;
        const updatedCurrentList = currentList.map(item => {
            if (item.id === id) {
                let updated = { ...item, [field]: val };
                if (field === 'lastCal' || field === 'frequency') updated = recalculateRow(updated);
                updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val}`, user: 'User' }];
                return updated;
            }
            return item;
        });

        // 2. Handle the "Mirroring" logic
        const idParts = id.split('-');
        const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

        if (baseId) {
            // Determine the counterpart list
            const counterpartPrefix = activeTab === 'service' ? 'r-' : 's-';
            const counterpartId = `${counterpartPrefix}${baseId}`;
            const counterpartList = activeTab === 'service' ? currentRollerData : currentServiceData;

            let updatedCounterpartList = counterpartList;

            // ONLY update the counterpart if it is NOT an independent field (like dates)
            if (!isIndependentField) {
                updatedCounterpartList = counterpartList.map(item => {
                    if (item.id === counterpartId) {
                        return { 
                            ...item, 
                            [field]: val,
                            history: [...(item.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val} (synced)`, user: 'User' }]
                        };
                    }
                    return item;
                });
            }

            // Save both lists
            if (activeTab === 'service') {
                updateSiteData(selectedSiteId, { serviceData: updatedCurrentList, rollerData: updatedCounterpartList }, `Update ${field}`);
            } else {
                updateSiteData(selectedSiteId, { serviceData: updatedCounterpartList, rollerData: updatedCurrentList }, `Update ${field}`);
            }
        } else {
            // Fallback for legacy items without matching IDs
            if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: updatedCurrentList }, `Update ${field}`); }
            else { updateSiteData(selectedSiteId, { rollerData: updatedCurrentList }, `Update ${field}`); }
        }
    };

    const handleAddSpecNote = (specNoteInput, selectedSpecs) => {
        if (!specNoteInput.content || !selectedSpecs) return;
        const newN = { id: `sn-${Date.now()}`, content: specNoteInput.content, author: specNoteInput.author || 'Unknown', timestamp: new Date().toISOString() };
        const updatedSpec = { ...selectedSpecs, notes: [...(selectedSpecs.notes || []), newN] };
        updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) }, 'Add Spec Note');
    };

    const handleDeleteSpecNote = (noteId, selectedSpecs) => {
        if (!selectedSpecs) return;
        const updatedSpec = { ...selectedSpecs, notes: selectedSpecs.notes.filter(n => n.id !== noteId) };
        updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    };

    const saveEditedNote = (editingNoteId, editNoteContent, selectedSpecs) => {
        if (!selectedSpecs || !editingNoteId) return;
        const updatedNotes = selectedSpecs.notes.map(n => {
            if (n.id === editingNoteId) {
                return { ...n, content: editNoteContent.content, author: editNoteContent.author, timestamp: new Date().toISOString() };
            }
            return n;
        });
        const updatedSpec = { ...selectedSpecs, notes: updatedNotes };
        updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    };

    const uploadServiceReport = (assetId, reportData) => {
        // Use functional state update to prevent stale data issues during rapid uploads
        setSites(prevSites => {
            return prevSites.map(site => {
                if (site.id !== selectedSiteId) return site; // Only update selected site

                // Helper to update specific asset list (service or roller)
                const updateList = (list) => list.map(asset => {
                    if (asset.id === assetId) {
                        return { ...asset, reports: [...(asset.reports || []), reportData] };
                    }
                    return asset;
                });

                return {
                    ...site,
                    serviceData: updateList(site.serviceData || []),
                    rollerData: updateList(site.rollerData || [])
                };
            });
        });
    };

    const deleteServiceReport = (assetId, reportId) => {
        const updateList = (list) => list.map(a => {
            if (a.id === assetId) {
                return { ...a, reports: (a.reports || []).filter(r => r.id !== reportId) };
            }
            return a;
        });

        updateSiteData(selectedSiteId, {
            serviceData: updateList(currentServiceData),
            rollerData: updateList(currentRollerData)
        }, 'Delete Service Report');
    };

    const handleFileChange = (e) => {
        const fileReader = new FileReader();
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = e => {
            try {
                const parsedData = JSON.parse(e.target.result);
                if (Array.isArray(parsedData)) {
                    const loadedData = safelyLoadData(parsedData);
                    setSites(loadedData);
                    alert("Data loaded successfully!");
                }
            } catch { alert("Error reading file."); }
        };
    };

    // ==========================================
    // SITE NOTES MANAGEMENT
    // ==========================================
    const handleAddSiteNote = (siteId, noteData) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        
        const updatedNotes = [...(site.notes || []), noteData];
        updateSiteData(siteId, { notes: updatedNotes }, 'Add Site Note');
    };

    const handleUpdateSiteNote = (siteId, noteId, updates) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        
        const updatedNotes = (site.notes || []).map(note => 
            note.id === noteId ? { ...note, ...updates } : note
        );
        updateSiteData(siteId, { notes: updatedNotes }, 'Update Site Note');
    };

    const handleDeleteSiteNote = (siteId, noteId) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        
        const updatedNotes = (site.notes || []).filter(note => note.id !== noteId);
        updateSiteData(siteId, { notes: updatedNotes }, 'Delete Site Note');
    };

    const handleArchiveSiteNote = (siteId, noteId, archived) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        
        const updatedNotes = (site.notes || []).map(note => 
            note.id === noteId ? { ...note, archived } : note
        );
        updateSiteData(siteId, { notes: updatedNotes }, archived ? 'Archive Site Note' : 'Restore Site Note');
    };

    const handleClearAllHistory = () => {
        const updatedSites = sites.map(site => ({
            ...site,
            notes: [],
            serviceData: (site.serviceData || []).map(asset => ({
                ...asset,
                history: [],
                reports: []
            })),
            rollerData: (site.rollerData || []).map(asset => ({
                ...asset,
                history: [],
                reports: []
            })),
            specData: (site.specData || []).map(spec => ({
                ...spec,
                history: [],
                notes: []
            }))
        }));

        addUndoAction({
            description: 'Clear All App History',
            undo: () => setSites(sites), // Restore original sites
            redo: () => setSites(updatedSites) // Redo the clear
        });

        setSites(updatedSites);
    };

    return (
        <SiteContext.Provider value={{
            sites, setSites,
            selectedSiteId, setSelectedSiteId,
            isDataLoaded,
            selectedSite,
            currentServiceData,
            currentRollerData,
            currentSpecData,
            updateSiteData,
            handleAddSite,
            handleGenerateSample,
            handleDeleteSite,
            handleUpdateSiteInfo,
            toggleSiteStatus,
            handleAddIssue,
            handleDeleteIssue,
            handleToggleIssueStatus,
            handleUpdateIssue,
            handleCopyIssue,
            handleAddAsset,
            handleDeleteAsset,
            handleSaveEditedAsset,
            handleSaveEditedSpecs,
            handleInlineUpdate,
            handleAddSpecNote,
            handleDeleteSpecNote,
            saveEditedNote,
            handleSaveReport: uploadServiceReport, // Alias for backward compatibility if needed, or just replace usage
            handleDeleteReport: deleteServiceReport, // Alias
            uploadServiceReport,
            deleteServiceReport,
            handleFileChange,
            handleClearAllHistory,
            handleAddSiteNote,
            handleUpdateSiteNote,
            handleDeleteSiteNote,
            handleArchiveSiteNote
        }}>
            {children}
        </SiteContext.Provider>
    );
};
