import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SiteProvider, useSiteContext } from '../SiteContext';
import { UndoProvider } from '../UndoContext';

// Wrapper to provide both contexts
const Wrapper = ({ children }) => (
    <UndoProvider>
        <SiteProvider>
            {children}
        </SiteProvider>
    </UndoProvider>
);

describe('SiteContext - Customer Edit Regression', () => {
    it('should update customer name when handleUpdateSiteInfo is called', () => {
        const { result } = renderHook(() => useSiteContext(), { wrapper: Wrapper });

        // 1. Add a site
        const initialSite = {
            name: 'Test Site',
            customer: 'Old Customer',
            location: 'Test Location',
            type: 'Mine'
        };

        let addedSite;
        act(() => {
            addedSite = result.current.handleAddSite(initialSite, { content: 'Note' });
        });

        expect(addedSite).toBeDefined();
        expect(addedSite.customer).toBe('Old Customer');

        // 2. Update customer
        const updatedInfo = {
            ...addedSite,
            customer: 'New Customer'
        };

        act(() => {
            result.current.handleUpdateSiteInfo(updatedInfo);
        });

        // 3. Verify update
        const site = result.current.sites.find(s => s.id === addedSite.id);
        expect(site.customer).toBe('New Customer');
    });

    it('should save new specification when handleSaveEditedSpecs is called', () => {
        const { result } = renderHook(() => useSiteContext(), { wrapper: Wrapper });

        // 1. Add a site
        const initialSite = { name: 'Spec Site', customer: 'Spec Customer' };
        let addedSite;
        act(() => {
            addedSite = result.current.handleAddSite(initialSite, { content: '' });
        });

        // Select the site (required for handleSaveEditedSpecs)
        act(() => {
            result.current.setSelectedSiteId(addedSite.id);
        });

        // 2. Save new spec
        const newSpec = {
            weigher: 'Weigher 1',
            make: 'Test Make',
            model: 'Test Model'
        };

        act(() => {
            result.current.handleSaveEditedSpecs(newSpec);
        });

        // 3. Verify spec added
        const site = result.current.sites.find(s => s.id === addedSite.id);
        expect(site.specData).toBeDefined();
        expect(site.specData).toHaveLength(1);
        expect(site.specData[0].weigher).toBe('Weigher 1');
    });
});
