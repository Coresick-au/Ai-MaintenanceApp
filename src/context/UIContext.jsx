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
    const [siteForm, setSiteForm] = useState({
        id: null, name: '', customer: '', location: '', contactName: '', contactEmail: '', contactPosition: '', contactPhone1: '', contactPhone2: '', active: true, notes: [], logo: null, issues: []
    });
    const [noteInput, setNoteInput] = useState({ content: '', author: '' });
    const [newAsset, setNewAsset] = useState({ name: '', weigher: '', code: '', lastCal: '', frequency: '' });
    const [specNoteInput, setSpecNoteInput] = useState({ content: '', author: '' });

    // --- THEME & MENUS ---
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState(null);

    // --- EASTER EGG ---
    const [lightModeCount, setLightModeCount] = useState(0);
    const [isCooked, setIsCooked] = useState(false);
    const [lightModeMessage, setLightModeMessage] = useState("Light mode users be like: \"I love squinting. It builds character.\"");
    const [showLightModeMessage, setShowLightModeMessage] = useState(false);
    const messageTimeoutRef = React.useRef(null);

    const handleLightModeClick = () => {
        // 1. Increment Counter (Functional Update for Reliability)
        setLightModeCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 10) {
                setIsCooked(true);
                setTimeout(() => setIsCooked(false), 5000); // Reset after 5 seconds
                return 0;
            }
            return newCount;
        });

        // 2. Toggle Message Logic
        if (showLightModeMessage) {
            // If already showing, clear timeout and hide immediately
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
                messageTimeoutRef.current = null;
            }
            setShowLightModeMessage(false);
            return;
        }

        // 3. Cycle Messages (only if we are going to show it)
        const messages = [
            "Light mode users be like: \"I love squinting. It builds character.\"",
            "Light mode: for people who think their screen should double as a flashlight.",
            "You know, pressing it more doesn’t make it work faster",
            "Are you trying to blind yourself?",
            "Stop it. Get some help.",
            "Dark mode is superior. Accept it."
        ];

        setLightModeMessage(prevMsg => {
            let currentIndex = messages.indexOf(prevMsg);
            if (currentIndex === -1) currentIndex = 0;
            const nextIndex = (currentIndex + 1) % messages.length;
            return messages[nextIndex];
        });

        // 4. Show Message with 2s Timer
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
