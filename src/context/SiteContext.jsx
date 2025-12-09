import React, { useState, useEffect, useMemo } from 'react';
import { useUndo } from '../hooks/useUndo';
import { recalculateRow, generateSampleSite } from '../data/mockData';
import { safelyLoadData } from '../utils/dataUtils';
import { SiteContext } from './SiteContext.context';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase';
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    updateDoc,
    query,
    orderBy
} from 'firebase/firestore';

// Helper function to format full location string
const formatFullLocation = (siteForm) => {
    const parts = [];
    if (siteForm.streetAddress) parts.push(siteForm.streetAddress);
    if (siteForm.city) parts.push(siteForm.city);
    if (siteForm.state) parts.push(siteForm.state);
    if (siteForm.postcode) parts.push(siteForm.postcode);
    if (siteForm.country && siteForm.country !== 'Australia') parts.push(siteForm.country);

    if (parts.length === 0 && siteForm.location) {
        return siteForm.location;
    }

    return parts.join(', ') || '';
};

export { SiteContext };
export const SiteProvider = ({ children }) => {
    const { addUndoAction } = useUndo();
    const [sites, setSites] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [todos, setTodos] = useState([]);

    // --- FIREBASE SYNC (Replaces Persistence & Auto-Save) ---
    useEffect(() => {
        console.log('[SiteContext] Initializing Firebase Listeners...');

        // 1. Sync Sites
        const unsubscribeSites = onSnapshot(collection(db, "sites"), (snapshot) => {
            const cloudSites = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('[SiteContext] Synced sites from Cloud:', cloudSites.length);
            setSites(cloudSites);
            // Cache for offline access
            try { localStorage.setItem('app_data', JSON.stringify(cloudSites)); } catch (e) { console.warn('LocalStorage full', e); }
            setIsDataLoaded(true);
        }, (error) => {
            console.error("Error fetching sites from Firebase:", error);
            // Fallback to local storage if offline or error
            const localData = localStorage.getItem('app_data');
            if (localData) {
                try {
                    setSites(JSON.parse(localData));
                    console.warn('Loaded sites from LocalStorage fallback');
                } catch (e) { }
            }
        });

        // 2. Sync Employees (Authentication/User Management)
        const unsubscribeEmps = onSnapshot(collection(db, "employees"), (snapshot) => {
            const cloudEmps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('[SiteContext] Synced employees from Cloud:', cloudEmps.length);
            setEmployees(cloudEmps);
            try { localStorage.setItem('app_employees', JSON.stringify(cloudEmps)); } catch (e) { console.warn('LocalStorage full', e); }
        }, (error) => {
            console.error("Error fetching employees from Firebase:", error);
        });

        // 3. Sync To-Dos
        const unsubscribeTodos = onSnapshot(
            query(collection(db, "todos"), orderBy("timestamp", "desc")),
            (snapshot) => {
                const cloudTodos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTodos(cloudTodos);
            },
            (error) => { console.error("Error fetching todos:", error); }
        );

        return () => {
            unsubscribeSites();
            unsubscribeEmps();
            unsubscribeTodos();
        };
    }, []);

    // --- DERIVED STATE ---
    const selectedSite = useMemo(() => sites.find(s => s.id === selectedSiteId), [sites, selectedSiteId]);
    const currentServiceData = selectedSite ? (selectedSite.serviceData || []) : [];
    const currentRollerData = selectedSite ? (selectedSite.rollerData || []) : [];
    const currentSpecData = useMemo(() => selectedSite ? (selectedSite.specData || []) : [], [selectedSite]);

    // --- ACTIONS (Directly to Firestore) ---

    // Generic Update Function
    const updateSiteData = async (siteId, updates, description = 'Update Site Data') => {
        // Optimistic UI update
        // (Note: Firestore listeners are fast, so we *could* skip this, 
        // but keeping it ensures instant feedback even on slow connections)
        setSites(prev => prev.map(s => s.id === siteId ? { ...s, ...updates } : s));

        try {
            const siteRef = doc(db, "sites", siteId);
            await updateDoc(siteRef, updates);
            // Also update localStorage as backup
            // localStorage.setItem('app_data', JSON.stringify(sites)); 
        } catch (e) {
            console.error(`Error updating site ${siteId}:`, e);
            // alert("Failed to save changes to cloud. Check internet.");
        }
    };

    const handleAddSite = async (siteForm, noteInput) => {
        if (!siteForm.name) return;
        const newSiteId = `site-${Date.now()}`;
        const initialNotes = noteInput.content ? [{
            id: `n-${Date.now()}`,
            content: noteInput.content,
            author: noteInput.author || 'Admin',
            timestamp: new Date().toISOString()
        }] : [];

        const newSite = {
            id: newSiteId,
            customerId: siteForm.customerId || null, // NEW: Link to customer
            name: siteForm.name,
            customer: siteForm.customer, // Keep for backward compatibility
            location: siteForm.location,
            fullLocation: formatFullLocation(siteForm),
            streetAddress: siteForm.streetAddress || '',
            city: siteForm.city || '',
            state: siteForm.state || '',
            postcode: siteForm.postcode || '',
            country: siteForm.country || 'Australia',
            gpsCoordinates: siteForm.gpsCoordinates || '',
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
            photoFolderLink: siteForm.photoFolderLink || '', // New Photo Link Field
            serviceData: [],
            rollerData: [],
            specData: [],
            issues: []
        };

        // Add to Cloud
        try {
            await setDoc(doc(db, "sites", newSiteId), newSite);
            setSelectedSiteId(newSiteId);
        } catch (e) {
            console.error("Error creating site:", e);
            alert("Failed to create site in cloud.");
        }

        return newSite;
    };

    const handleDeleteSite = async (siteId) => {
        const site = sites.find(s => s.id === siteId);
        const siteName = site ? site.name : 'this site';
        if (!window.confirm(`Are you sure you want to delete "${siteName}"? This action cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, "sites", siteId));
            if (selectedSiteId === siteId) {
                setSelectedSiteId(null);
                localStorage.removeItem('selected_site_id');
            }
        } catch (e) {
            console.error("Error deleting site:", e);
        }
    };

    const handleUpdateSiteInfo = (siteForm) => {
        updateSiteData(siteForm.id, {
            name: siteForm.name,
            customer: siteForm.customer,
            location: siteForm.location,
            fullLocation: formatFullLocation(siteForm),
            streetAddress: siteForm.streetAddress || '',
            city: siteForm.city || '',
            state: siteForm.state || '',
            postcode: siteForm.postcode || '',
            country: siteForm.country || 'Australia',
            gpsCoordinates: siteForm.gpsCoordinates || '',
            contactName: siteForm.contactName,
            contactEmail: siteForm.contactEmail,
            contactPosition: siteForm.contactPosition,
            contactPhone1: siteForm.contactPhone1,
            contactPhone2: siteForm.contactPhone2,
            notes: siteForm.notes,
            logo: siteForm.logo,
            type: siteForm.type,
            typeDetail: siteForm.typeDetail,
            photoFolderLink: siteForm.photoFolderLink // Update Photo Link
        }, 'Update Site Info');
    };

    const toggleSiteStatus = async (site) => {
        const isActivating = site.active === false;
        const newNote = {
            id: `n-${Date.now()}`,
            content: isActivating ? 'Site Re-activated' : 'Site Archived',
            author: 'System',
            timestamp: new Date().toISOString()
        };

        // This relies on updateSiteData to sync
        updateSiteData(site.id, {
            active: isActivating,
            notes: [...(site.notes || []), newNote]
        }, 'Toggle Site Status');

        return isActivating;
    };

    // --- SITE NOTE ACTIONS ---
    const handleAddSiteNote = (siteId, content, author) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        const newNote = {
            id: `n-${Date.now()}`,
            content: content,
            author: author || 'User',
            timestamp: new Date().toISOString(),
            archived: false
        };
        updateSiteData(siteId, {
            notes: [...(site.notes || []), newNote]
        }, 'Add Site Note');
    };

    const handleUpdateSiteNote = (siteId, noteId, newContent) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        const updatedNotes = (site.notes || []).map(n =>
            n.id === noteId ? { ...n, content: newContent, timestamp: new Date().toISOString() } : n
        );
        updateSiteData(siteId, { notes: updatedNotes }, 'Update Site Note');
    };

    const handleDeleteSiteNote = (siteId, noteId) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        const updatedNotes = (site.notes || []).filter(n => n.id !== noteId);
        updateSiteData(siteId, { notes: updatedNotes }, 'Delete Site Note');
    };

    const handleArchiveSiteNote = (siteId, noteId, currentStatus) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        const updatedNotes = (site.notes || []).map(n =>
            n.id === noteId ? { ...n, archived: !currentStatus } : n
        );
        updateSiteData(siteId, { notes: updatedNotes }, currentStatus ? 'Restore Site Note' : 'Archive Site Note');
    };

    // --- ISSUE ACTIONS ---
    const handleAddIssue = (siteId, newIssue) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;

        const selectedAsset = [...(site.serviceData || []), ...(site.rollerData || [])].find(
            asset => asset.id === newIssue.assetId
        );

        const issueWithDetails = {
            ...newIssue,
            assetName: selectedAsset ? `${selectedAsset.name} (${selectedAsset.code})` : 'N/A',
        };

        updateSiteData(siteId, {
            issues: [...(site.issues || []), issueWithDetails]
        }, 'Add Issue');
    };

    // Simplification: Reuse updateSiteData for all sub-array updates
    // (In Firestore, it's better to update the whole array unless standardizing on subcollections)
    // Since we're migrating from a document-based structure, keeping the arrays inside the document
    // is the easiest path (and acceptable for < 1MB documents, which sites likely are)

    const handleDeleteIssue = (siteId, issueId) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;
        const issue = site.issues?.find(i => i.id === issueId);
        const issueTitle = issue ? issue.title : 'this issue';
        if (!window.confirm(`Are you sure you want to delete the issue "${issueTitle}"?`)) return;

        updateSiteData(siteId, {
            issues: (site.issues || []).filter(i => i.id !== issueId)
        }, 'Delete Issue');
    };

    const handleToggleIssueStatus = (siteId, issueId) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;

        const updatedIssues = (site.issues || []).map(issue =>
            issue.id === issueId ? {
                ...issue,
                status: issue.status === 'Completed' ? 'Open' : 'Completed',
                completedAt: issue.status === 'Completed' ? null : new Date().toISOString(),
            } : issue
        );
        updateSiteData(siteId, { issues: updatedIssues }, 'Toggle Issue Status');
    };

    const handleUpdateIssue = (siteId, issueId, updatedFields) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;

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
        updateSiteData(siteId, { issues: updatedIssues }, 'Update Issue');
    };

    const handleCopyIssue = (issue) => {
        const issueText = `Issue: ${issue.title}\nDescription: ${issue.description || 'N/A'}\nAsset: ${issue.assetName || 'N/A'}\nPriority: ${issue.priority || 'N/A'}\nStatus: ${issue.status}`;
        navigator.clipboard.writeText(issueText).then(() => {
            alert('Issue details copied to clipboard!');
        });
    };

    // --- ASSET ACTIONS ---
    const handleAddAsset = (newAsset, activeTab) => {
        if (!selectedSite || !newAsset.name || !newAsset.code) return;

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
        } catch (error) { console.error(error); }
    };

    const handleDeleteAsset = (editingAsset) => {
        if (!editingAsset || !selectedSite) return;
        const assetName = editingAsset.name || 'this asset';
        if (!window.confirm(`Are you sure you want to delete "${assetName}" (${editingAsset.code})? This will remove it from both Service and Roller schedules.`)) return;

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

    // ... Using the same logic as before, but simplified into updateSiteData calls ...
    const handleSaveEditedAsset = (editingAsset, activeTab) => {
        // Logic remains same as original (calculating updates), 
        // but ends with updateSiteData which now syncs to Firebase.
        // RE-IMPLEMENTING LOGIC FROM ORIGINAL FILE:
        if (!editingAsset) return;
        const updatedPrimary = recalculateRow(editingAsset);
        const newHistory = { date: new Date().toISOString(), action: 'Details Updated', user: 'User' };
        updatedPrimary.history = [...(updatedPrimary.history || []), newHistory];

        let newServiceData = [...currentServiceData];
        let newRollerData = [...currentRollerData];

        if (activeTab === 'service') {
            newServiceData = newServiceData.map(i => i.id === updatedPrimary.id ? updatedPrimary : i);
        } else {
            newRollerData = newRollerData.map(i => i.id === updatedPrimary.id ? updatedPrimary : i);
        }

        const idParts = editingAsset.id.split('-');
        const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

        if (baseId) {
            const counterpartPrefix = activeTab === 'service' ? 'r-' : 's-';
            const counterpartId = `${counterpartPrefix}${baseId}`;
            const sharedUpdates = {
                name: updatedPrimary.name,
                code: updatedPrimary.code,
                weigher: updatedPrimary.weigher,
            };
            const updateCounterpartList = (list) => list.map(item => {
                if (item.id === counterpartId) {
                    return { ...item, ...sharedUpdates, history: [...(item.history || []), newHistory] };
                }
                return item;
            });
            if (activeTab === 'service') newRollerData = updateCounterpartList(newRollerData);
            else newServiceData = updateCounterpartList(newServiceData);
        }
        updateSiteData(selectedSiteId, { serviceData: newServiceData, rollerData: newRollerData }, 'Update Asset Details');
    };

    const handleInlineUpdate = (id, field, val, activeTab) => {
        // Logic remains the same, calculating new array states
        const independentFields = ['lastCal', 'frequency', 'dueDate', 'remaining'];
        const isIndependentField = independentFields.includes(field);
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

        const idParts = id.split('-');
        const baseId = idParts.length > 1 ? idParts.slice(1).join('-') : null;

        if (baseId) {
            const counterpartPrefix = activeTab === 'service' ? 'r-' : 's-';
            const counterpartId = `${counterpartPrefix}${baseId}`;
            const counterpartList = activeTab === 'service' ? currentRollerData : currentServiceData;
            let updatedCounterpartList = counterpartList;

            if (!isIndependentField) {
                updatedCounterpartList = counterpartList.map(item => {
                    if (item.id === counterpartId) {
                        return { ...item, [field]: val, history: [...(item.history || []), { date: new Date().toISOString(), action: `${field} changed to ${val} (synced)`, user: 'User' }] };
                    }
                    return item;
                });
            }
            if (activeTab === 'service') updateSiteData(selectedSiteId, { serviceData: updatedCurrentList, rollerData: updatedCounterpartList });
            else updateSiteData(selectedSiteId, { serviceData: updatedCounterpartList, rollerData: updatedCurrentList });
        } else {
            if (activeTab === 'service') updateSiteData(selectedSiteId, { serviceData: updatedCurrentList });
            else updateSiteData(selectedSiteId, { rollerData: updatedCurrentList });
        }
    };

    // --- SPEC ACTIONS ---
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

    // Notes logic... simplified
    const handleAddSpecNote = (specNoteInput, selectedSpecs) => {
        const newN = { id: `sn-${Date.now()}`, content: specNoteInput.content, author: specNoteInput.author || 'Unknown', timestamp: new Date().toISOString() };
        const updatedSpec = { ...selectedSpecs, notes: [...(selectedSpecs.notes || []), newN] };
        updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    };
    const handleDeleteSpecNote = (noteId, selectedSpecs) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        const updatedSpec = { ...selectedSpecs, notes: selectedSpecs.notes.filter(n => n.id !== noteId) };
        updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    };
    const saveEditedNote = (editingNoteId, editNoteContent, selectedSpecs) => {
        const updatedNotes = selectedSpecs.notes.map(n => n.id === editingNoteId ? { ...n, ...editNoteContent, timestamp: new Date().toISOString() } : n);
        const updatedSpec = { ...selectedSpecs, notes: updatedNotes };
        updateSiteData(selectedSiteId, { specData: currentSpecData.map(s => s.id === selectedSpecs.id ? updatedSpec : s) });
    };

    // --- REPORT ACTIONS ---
    const uploadServiceReport = async (assetId, reportData) => {
        const site = sites.find(s => s.id === selectedSiteId);
        if (!site) return;

        const updateList = (list) => list.map(asset => {
            if (asset.id === assetId) {
                return { ...asset, reports: [...(asset.reports || []), reportData] };
            }
            return asset;
        });

        updateSiteData(selectedSiteId, {
            serviceData: updateList(site.serviceData || []),
            rollerData: updateList(site.rollerData || [])
        }, 'Upload Report Record');
    };

    const deleteServiceReport = async (assetId, reportId) => {
        const site = sites.find(s => s.id === selectedSiteId);
        if (!site) return;

        const updateList = (list) => list.map(a => {
            if (a.id === assetId) {
                return { ...a, reports: (a.reports || []).filter(r => r.id !== reportId) };
            }
            return a;
        });
        updateSiteData(selectedSiteId, {
            serviceData: updateList(site.serviceData || []),
            rollerData: updateList(site.rollerData || [])
        }, 'Delete Report');
    };

    // --- EMPLOYEE ACTIONS (Syncs to 'employees' collection) ---
    const handleAddEmployee = async (empData) => {
        const newEmpId = `emp-${Date.now()}`;
        const newEmp = {
            id: newEmpId,
            name: empData.name,
            role: empData.role || 'Technician',
            email: empData.email || '',
            phone: empData.phone || '',
            active: true,
            certifications: [],
            inductions: []
        };
        try {
            await setDoc(doc(db, "employees", newEmpId), newEmp);
        } catch (e) { console.error("Error adding employee:", e); }
    };

    const handleUpdateEmployee = async (empId, updates) => {
        try {
            await updateDoc(doc(db, "employees", empId), updates);
        } catch (e) { console.error("Error updating employee:", e); }
    };

    const handleDeleteEmployee = async (empId) => {
        const emp = employees.find(e => e.id === empId);
        const empName = emp ? emp.name : 'this technician';
        if (!window.confirm(`Are you sure you want to delete "${empName}"? All certifications and inductions will be permanently removed.`)) return;

        try {
            await deleteDoc(doc(db, "employees", empId));
        } catch (e) { console.error("Error deleting employee:", e); }
    };

    // --- FILE HANDLING (Just for loading legacy json backups) ---
    const handleFileChange = (e) => {
        const fileReader = new FileReader();
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = e => {
            try {
                const parsed = JSON.parse(e.target.result);
                // If we want to restore from backup, we might need to iterate and setDoc for each site
                alert("Local JSON loaded into view (NOT synced to Cloud yet). To import, implementation needed.");
                if (Array.isArray(parsed)) setSites(parsed);
            } catch { alert("Error reading file"); }
        };
    };

    // --- MISC ---
    const handleGenerateSample = async () => {
        // Generate the sample data object
        const sample = generateSampleSite();

        try {
            // Save it to Firebase (Firestore)
            // The 'onSnapshot' listener will automatically detect this new document and update the UI
            await setDoc(doc(db, "sites", sample.id), sample);

            console.log(`[Cloud] Demo site generated: ${sample.name}`);
        } catch (error) {
            console.error("Error creating demo site:", error);
            alert("Failed to save demo site to the database.");
        }
    };
    const handleClearAllHistory = () => { alert("Global history clear not implemented for Cloud DB"); };

    // --- TODO ACTIONS ---
    const handleAddTodo = async (todoData) => {
        const id = `todo-${Date.now()}`;
        try {
            await setDoc(doc(db, "todos", id), { id, ...todoData });
        } catch (e) { console.error("Error adding todo:", e); }
    };

    const handleUpdateTodo = async (id, updates) => {
        try {
            await updateDoc(doc(db, "todos", id), updates);
        } catch (e) { console.error("Error updating todo:", e); }
    };

    const handleDeleteTodo = async (id) => {
        if (!window.confirm('Are you sure you want to delete this to-do item?')) return;

        try {
            await deleteDoc(doc(db, "todos", id));
        } catch (e) { console.error("Error deleting todo:", e); }
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

            // Core Actions
            updateSiteData,
            handleAddSite,
            handleDeleteSite,
            handleUpdateSiteInfo,
            toggleSiteStatus,
            handleFileChange,
            handleGenerateSample,

            // Sub-actions
            handleAddIssue, handleDeleteIssue, handleToggleIssueStatus, handleUpdateIssue, handleCopyIssue,
            handleAddAsset, handleDeleteAsset, handleSaveEditedAsset, handleInlineUpdate,
            handleSaveEditedSpecs, handleAddSpecNote, handleDeleteSpecNote, saveEditedNote,
            handleAddSiteNote, handleUpdateSiteNote, handleDeleteSiteNote, handleArchiveSiteNote,

            // Report Actions
            uploadServiceReport, deleteServiceReport,

            // Employee Actions
            employees, setEmployees,
            handleAddEmployee, handleUpdateEmployee, handleDeleteEmployee,

            // To-Do Actions
            todos,
            handleAddTodo,
            handleUpdateTodo,
            handleDeleteTodo
        }}>
            {children}
        </SiteContext.Provider>
    );
};
