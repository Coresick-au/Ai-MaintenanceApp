import React, { createContext, useState, useEffect, useMemo, useContext } from 'react';
import { useUndo } from './UndoContext';
import { recalculateRow, generateSampleSite } from '../data/mockData';

const SiteContext = createContext();

export const useSiteContext = () => useContext(SiteContext);

// HELPER: SAFELY LOAD DATA
const safelyLoadData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(site => ({
        ...site,
        customer: site.customer || '',
        contactName: site.contactName || '',
        contactEmail: site.contactEmail || '',
        contactPosition: site.contactPosition || '',
        contactPhone1: site.contactPhone1 || '',
        contactPhone2: site.contactPhone2 || '',
        active: site.active !== false,
        serviceData: Array.isArray(site.serviceData) ? site.serviceData.map(i => ({ ...i, active: i.active !== false })) : [],
        rollerData: Array.isArray(site.rollerData) ? site.rollerData.map(i => ({ ...i, active: i.active !== false })) : [],
        specData: Array.isArray(site.specData) ? site.specData : [],
        notes: Array.isArray(site.notes) ? site.notes : [],
        issues: Array.isArray(site.issues) ? site.issues.map(issue => ({
            ...issue,
            importance: issue.importance || 'Medium',
            assetId: issue.assetId || null,
            assetName: issue.assetName || null,
        })) : [],
    }));
};

export const SiteProvider = ({ children }) => {
    const { addUndoAction } = useUndo();
    const [sites, setSites] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // --- PERSISTENCE ---
    useEffect(() => {
        // Load Sites
        const savedData = localStorage.getItem('app_data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setSites(safelyLoadData(parsed));
            } catch (e) { console.error("Failed to load sites:", e); }
        }

        // Load Selected Site ID (FIX: Persist selection across refreshes)
        const savedSiteId = localStorage.getItem('selected_site_id');
        if (savedSiteId) setSelectedSiteId(savedSiteId);

        setIsDataLoaded(true);
    }, []);

    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('app_data', JSON.stringify(sites));
        }
    }, [sites, isDataLoaded]);

    useEffect(() => {
        // Save Selected Site ID when it changes
        if (selectedSiteId) localStorage.setItem('selected_site_id', selectedSiteId);
    }, [selectedSiteId]);

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

        if (site) {
            addUndoAction({
                description: description,
                undo: () => setSites(current => current.map(s => s.id === siteId ? site : s))
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
            serviceData: [],
            rollerData: [],
            specData: []
        };

        addUndoAction({
            description: `Add Site: ${newSite.name}`,
            undo: () => setSites(prev => prev.filter(s => s.id !== newSite.id))
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
            logo: siteForm.logo
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
        const updated = recalculateRow(editingAsset);
        const newHistory = { date: new Date().toISOString(), action: 'Details Updated', user: 'User' };
        updated.history = [...(updated.history || []), newHistory];
        if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: currentServiceData.map(i => i.id === updated.id ? updated : i) }, 'Update Asset Details'); }
        else { updateSiteData(selectedSiteId, { rollerData: currentRollerData.map(i => i.id === updated.id ? updated : i) }, 'Update Asset Details'); }
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
        const list = activeTab === 'service' ? currentServiceData : currentRollerData;
        const updatedList = list.map(item => {
            if (item.id === id) {
                let updated = { ...item, [field]: val };
                if (field === 'lastCal' || field === 'frequency') updated = recalculateRow(updated);
                updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val}`, user: 'User' }];
                return updated;
            }
            return item;
        });

        const idParts = id.split('-');
        const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

        if (baseId) {
            const pairedId = activeTab === 'service' ? `r-${baseId}` : `s-${baseId}`;
            const pairedList = activeTab === 'service' ? currentRollerData : currentServiceData;
            const updatedPairedList = pairedList.map(item => {
                if (item.id === pairedId) {
                    let updated = { ...item, [field]: val };
                    if (field === 'lastCal' || field === 'frequency') updated = recalculateRow(updated);
                    updated.history = [...(updated.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val} (synced)`, user: 'User' }];
                    return updated;
                }
                return item;
            });

            if (activeTab === 'service') {
                updateSiteData(selectedSiteId, { serviceData: updatedList, rollerData: updatedPairedList }, `Update ${field}`);
            } else {
                updateSiteData(selectedSiteId, { serviceData: updatedPairedList, rollerData: updatedList }, `Update ${field}`);
            }
        } else {
            if (activeTab === 'service') { updateSiteData(selectedSiteId, { serviceData: updatedList }, `Update ${field}`); }
            else { updateSiteData(selectedSiteId, { rollerData: updatedList }, `Update ${field}`); }
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

    const handleSaveReport = (assetId, reportData, viewAnalyticsAsset, setViewAnalyticsAsset) => {
        const updateList = (list) => list.map(a => {
            if (a.id === assetId) {
                return { ...a, reports: [...(a.reports || []), reportData] };
            }
            return a;
        });

        updateSiteData(selectedSiteId, {
            serviceData: updateList(currentServiceData),
            rollerData: updateList(currentRollerData)
        });

        if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
            setViewAnalyticsAsset(prev => ({ ...prev, reports: [...(prev.reports || []), reportData] }));
        }
    };

    const handleDeleteReport = (assetId, reportId, viewAnalyticsAsset, setViewAnalyticsAsset) => {
        const updateList = (list) => list.map(a => {
            if (a.id === assetId) {
                return { ...a, reports: (a.reports || []).filter(r => r.id !== reportId) };
            }
            return a;
        });

        updateSiteData(selectedSiteId, {
            serviceData: updateList(currentServiceData),
            rollerData: updateList(currentRollerData)
        });

        if (viewAnalyticsAsset && viewAnalyticsAsset.id === assetId) {
            setViewAnalyticsAsset(prev => ({ ...prev, reports: (prev.reports || []).filter(r => r.id !== reportId) }));
        }
    };

    const handleFileChange = (e) => {
        const fileReader = new FileReader();
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = e => {
            try {
                const parsedData = JSON.parse(e.target.result);
                if (Array.isArray(parsedData)) {
                    setSites(safelyLoadData(parsedData));
                    alert("Data loaded successfully!");
                }
            } catch { alert("Error reading file."); }
        };
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
            handleSaveReport,
            handleDeleteReport,
            handleFileChange
        }}>
            {children}
        </SiteContext.Provider>
    );
};
