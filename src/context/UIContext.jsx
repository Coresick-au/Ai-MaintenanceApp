import React, { createContext, useState, useEffect } from 'react';
import { LIGHT_MODE_MESSAGES, DEFAULT_SITE_FORM, DEFAULT_NOTE_INPUT, DEFAULT_NEW_ASSET, DEFAULT_SPEC_NOTE_INPUT } from '../constants/uiConstants';

const UIContext = createContext();

export { UIContext };
export const UIProvider = ({ children }) => {
    // --- MODALS ---
    const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
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
    const [lightModeMessage, setLightModeMessage] = useState(LIGHT_MODE_MESSAGES[0]);
    const [showLightModeMessage, setShowLightModeMessage] = useState(false);
    const messageTimeoutRef = React.useRef(null);

    const handleLightModeClick = () => {
        // 1. Toggle Message Logic
        if (showLightModeMessage) {
            // If already showing, clear timeout and hide immediately
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
                messageTimeoutRef.current = null;
            }
            setShowLightModeMessage(false);
            return;
        }

        // 2. Cycle Messages
        setLightModeMessage(prevMsg => {
            let currentIndex = LIGHT_MODE_MESSAGES.indexOf(prevMsg);
            if (currentIndex === -1) currentIndex = 0;
            const nextIndex = (currentIndex + 1) % LIGHT_MODE_MESSAGES.length;
            return LIGHT_MODE_MESSAGES[nextIndex];
        });

        // 3. Show Message with 2s Timer
        setShowLightModeMessage(true);
        messageTimeoutRef.current = setTimeout(() => {
            setShowLightModeMessage(false);
            messageTimeoutRef.current = null;
        }, 2000);
    };

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
            isAddSiteModalOpen, setIsAddSiteModalOpen,
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
            handleLightModeClick, isCooked, setIsCooked,
            lightModeMessage, showLightModeMessage
        }}>
            {children}
        </UIContext.Provider>
    );
};
