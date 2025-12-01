import React, { createContext, useState, useEffect, useContext } from 'react';

const UIContext = createContext();

export const useUIContext = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
    // --- MODALS ---
    const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
    const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isAssetEditModalOpen, setIsAssetEditModalOpen] = useState(false);
    const [isMasterListOpen, setIsMasterListOpen] = useState(false);
    const [isAppHistoryOpen, setIsAppHistoryOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    // --- SELECTION & EDITING ---
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [editingAsset, setEditingAsset] = useState(null);
    const [editingSpecs, setEditingSpecs] = useState(null);
    const [viewHistoryAsset, setViewHistoryAsset] = useState(null);
    const [viewContactSite, setViewContactSite] = useState(null);
    const [viewAnalyticsAsset, setViewAnalyticsAsset] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editNoteContent, setEditNoteContent] = useState({ content: '', author: '' });

    // --- FORMS ---
    const [siteForm, setSiteForm] = useState({
        id: null, name: '', customer: '', location: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null, issues: []
    });
    const [noteInput, setNoteInput] = useState({ content: '', author: '' });
    const [newAsset, setNewAsset] = useState({ name: '', weigher: '', code: '', lastCal: '', frequency: '' });
    const [specNoteInput, setSpecNoteInput] = useState({ content: '', author: '' });

    // --- THEME & MENUS ---
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <UIContext.Provider value={{
            isAddSiteModalOpen, setIsAddSiteModalOpen,
            isEditSiteModalOpen, setIsEditSiteModalOpen,
            isAssetModalOpen, setIsAssetModalOpen,
            isAssetEditModalOpen, setIsAssetEditModalOpen,
            isMasterListOpen, setIsMasterListOpen,
            isAppHistoryOpen, setIsAppHistoryOpen,
            isHelpModalOpen, setIsHelpModalOpen,
            selectedAssetId, setSelectedAssetId,
            editingAsset, setEditingAsset,
            editingSpecs, setEditingSpecs,
            viewHistoryAsset, setViewHistoryAsset,
            viewContactSite, setViewContactSite,
            viewAnalyticsAsset, setViewAnalyticsAsset,
            editingNoteId, setEditingNoteId,
            editNoteContent, setEditNoteContent,
            siteForm, setSiteForm,
            noteInput, setNoteInput,
            newAsset, setNewAsset,
            specNoteInput, setSpecNoteInput,
            theme, setTheme,
            isPrintMenuOpen, setIsPrintMenuOpen
        }}>
            {children}
        </UIContext.Provider>
    );
};
