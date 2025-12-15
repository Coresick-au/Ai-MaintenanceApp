import { BaseRepository } from './BaseRepository';

/**
 * Repository for managing customers in Firestore
 */
export class CustomerRepository extends BaseRepository {
    constructor() {
        super('customers');
    }

    /**
     * Find customer by name (case-insensitive)
     * @param {string} name - Customer name to search for
     * @returns {Promise<Object|null>} Customer object or null
     */
    async findByName(name) {
        const customers = await this.getAll();
        return customers.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
    }

    /**
     * Add contact to customer
     * @param {string} customerId - Customer ID
     * @param {Object} contactData - Contact information
     * @returns {Promise<Object>} Created contact
     */
    async addContact(customerId, contactData) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const newContact = {
            id: `cont-${Date.now()}`,
            siteIds: [],
            ...contactData
        };

        const updatedContacts = [...(customer.contacts || []), newContact];
        await this.update(customerId, { contacts: updatedContacts });

        return newContact;
    }

    /**
     * Update a specific contact
     * @param {string} customerId - Customer ID
     * @param {string} contactId - Contact ID
     * @param {Object} updatedData - Updated contact data
     * @returns {Promise<Object>} Updated contact
     */
    async updateContact(customerId, contactId, updatedData) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedContacts = (customer.contacts || []).map(c =>
            c.id === contactId ? { ...c, ...updatedData } : c
        );

        await this.update(customerId, { contacts: updatedContacts });
        return updatedContacts.find(c => c.id === contactId);
    }

    /**
     * Delete a contact
     * @param {string} customerId - Customer ID
     * @param {string} contactId - Contact ID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteContact(customerId, contactId) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedContacts = (customer.contacts || []).filter(c => c.id !== contactId);
        await this.update(customerId, { contacts: updatedContacts });

        return true;
    }

    /**
     * Add note to customer
     * @param {string} customerId - Customer ID
     * @param {string} noteContent - Note content
     * @param {string} noteAuthor - Author name
     * @returns {Promise<Object>} Created note
     */
    async addNote(customerId, noteContent, noteAuthor) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const newNote = {
            id: `note-${Date.now()}`,
            content: noteContent,
            author: noteAuthor || 'Unknown',
            timestamp: new Date().toISOString(),
            archived: false
        };

        const updatedNotes = [...(customer.notes || []), newNote];
        await this.update(customerId, { notes: updatedNotes });

        return newNote;
    }

    /**
     * Update a note
     * @param {string} customerId - Customer ID
     * @param {string} noteId - Note ID
     * @param {string} updatedContent - Updated note content
     * @returns {Promise<Object>} Updated note
     */
    async updateNote(customerId, noteId, updatedContent) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedNotes = (customer.notes || []).map(n =>
            n.id === noteId ? { ...n, content: updatedContent, lastEdited: new Date().toISOString() } : n
        );

        await this.update(customerId, { notes: updatedNotes });
        return updatedNotes.find(n => n.id === noteId);
    }

    /**
     * Delete a note
     * @param {string} customerId - Customer ID
     * @param {string} noteId - Note ID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteNote(customerId, noteId) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedNotes = (customer.notes || []).filter(n => n.id !== noteId);
        await this.update(customerId, { notes: updatedNotes });

        return true;
    }

    /**
     * Archive/unarchive a note
     * @param {string} customerId - Customer ID
     * @param {string} noteId - Note ID
     * @param {boolean} isArchived - Current archived state
     * @returns {Promise<boolean>} True if successful
     */
    async toggleNoteArchive(customerId, noteId, isArchived) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedNotes = (customer.notes || []).map(n =>
            n.id === noteId ? { ...n, archived: !isArchived } : n
        );

        await this.update(customerId, { notes: updatedNotes });
        return true;
    }

    /**
     * Add a managed site to a customer
     * @param {string} customerId - Customer ID
     * @param {Object} siteData - Site information
     * @returns {Promise<Object>} Created site
     */
    async addManagedSite(customerId, siteData) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const newSite = {
            id: `site-${Date.now()}`,
            ...siteData,
            // Ensure all required properties exist with defaults
            serviceData: siteData.serviceData || [],
            rollerData: siteData.rollerData || [],
            specData: siteData.specData || [],
            issues: siteData.issues || [],
            notes: siteData.notes || [],
            active: siteData.active !== undefined ? siteData.active : true,
            logo: siteData.logo || null,
            location: siteData.location || '',
            contact: siteData.contact || '',
            phone: siteData.phone || '',
            email: siteData.email || '',
            createdAt: new Date().toISOString(),
            hasAIMMProfile: false // Default to false for new managed sites
        };

        const updatedSites = [...(customer.managedSites || []), newSite];
        await this.update(customerId, { managedSites: updatedSites });

        return newSite;
    }

    /**
     * Update a managed site
     * @param {string} customerId - Customer ID
     * @param {string} siteId - Site ID
     * @param {Object} updatedData - Updated site data
     * @returns {Promise<Object>} Updated site
     */
    async updateManagedSite(customerId, siteId, updatedData) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedSites = (customer.managedSites || []).map(site =>
            site.id === siteId ? { ...site, ...updatedData } : site
        );

        await this.update(customerId, { managedSites: updatedSites });
        return updatedSites.find(s => s.id === siteId);
    }

    /**
     * Delete a managed site
     * @param {string} customerId - Customer ID
     * @param {string} siteId - Site ID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteManagedSite(customerId, siteId) {
        const customer = await this.getById(customerId);
        if (!customer) throw new Error('Customer not found');

        const updatedSites = (customer.managedSites || []).filter(site => site.id !== siteId);
        await this.update(customerId, { managedSites: updatedSites });

        return true;
    }

    /**
     * Archive a customer (soft delete)
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Updated customer
     */
    async archiveCustomer(customerId) {
        return this.update(customerId, { status: 'archived' });
    }

    /**
     * Restore an archived customer
     * @param {string} customerId - Customer ID
     * @returns {Promise<Object>} Updated customer
     */
    async restoreCustomer(customerId) {
        return this.update(customerId, { status: 'active' });
    }

    /**
     * Delete a customer permanently
     * WARNING: This permanently deletes the customer and all associated data
     * @param {string} customerId - Customer ID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteCustomer(customerId) {
        return this.delete(customerId);
    }
}
