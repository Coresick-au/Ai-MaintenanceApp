// Data loading and processing utilities

export const safelyLoadData = (data) => {
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

export const loadSitesFromStorage = () => {
    const savedData = localStorage.getItem('app_data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            return safelyLoadData(parsed);
        } catch (e) {
            console.error("Failed to load sites:", e);
            return [];
        }
    }
    return [];
};

export const loadSelectedSiteIdFromStorage = () => {
    const savedSiteId = localStorage.getItem('selected_site_id');
    return savedSiteId || null;
};
