import React, { createContext, useState, useEffect } from 'react';
import { DEFAULT_SITE_FORM, DEFAULT_NOTE_INPUT, DEFAULT_NEW_ASSET, DEFAULT_SPEC_NOTE_INPUT } from '../constants/uiConstants';

const UIContext = createContext();

export { UIContext };
export const UIProvider = ({ children }) => {
    // --- MODALS ---
    const [isEditSiteModalOpen, setIsEditSiteModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [isAssetEditModalOpen, setIsAssetEditModalOpen] = useState(false);
    const [isMasterListOpen, setIsMasterListOpen] = useState(false);
    const [isAppHistoryOpen, setIsAppHistoryOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isAppMapOpen, setIsAppMapOpen] = useState(false);

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
    const [siteForm, setSiteForm] = useState(DEFAULT_SITE_FORM);
    const [noteInput, setNoteInput] = useState(DEFAULT_NOTE_INPUT);
    const [newAsset, setNewAsset] = useState(DEFAULT_NEW_ASSET);
    const [specNoteInput, setSpecNoteInput] = useState(DEFAULT_SPEC_NOTE_INPUT);

    // --- THEME & MENUS ---
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState(null);

    // --- EASTER EGG ---
    const [isCooked, setIsCooked] = useState(false);



    const closeFullscreen = () => setExpandedSection(null);

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
            isEditSiteModalOpen, setIsEditSiteModalOpen,
            isAssetModalOpen, setIsAssetModalOpen,
            isAssetEditModalOpen, setIsAssetEditModalOpen,
            isMasterListOpen, setIsMasterListOpen,
            isAppHistoryOpen, setIsAppHistoryOpen,
            isHelpModalOpen, setIsHelpModalOpen,
            isAppMapOpen, setIsAppMapOpen,
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
            isPrintMenuOpen, setIsPrintMenuOpen,
            expandedSection, setExpandedSection,
            closeFullscreen,
            handleLightModeClick: () => { }, isCooked, setIsCooked,

        }}>
            {children}
        </UIContext.Provider>
    );
};
