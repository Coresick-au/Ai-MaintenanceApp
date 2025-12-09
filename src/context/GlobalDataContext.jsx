import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const GlobalDataContext = createContext();

export const GlobalDataProvider = ({ children }) => {
    const [customers, setCustomers] = useState([]);
    const [sites, setSites] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isRepairing, setIsRepairing] = useState(false);

    // --- SYNC FROM FIREBASE ---
    useEffect(() => {
        console.log('[GlobalDataContext] Initializing Firebase Listeners...');

        // 1. Sync Customers
        const unsubCustomers = onSnapshot(
            collection(db, 'customers'),
            (snap) => {
                const cloudCustomers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('[GlobalDataContext] Synced customers:', cloudCustomers.length);
                setCustomers(cloudCustomers);
            },
            (error) => {
                console.error('Error fetching customers from Firebase:', error);
            }
        );

        // 2. Sync Sites
        const unsubSites = onSnapshot(
            collection(db, 'sites'),
            (snap) => {
                const cloudSites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('[GlobalDataContext] Synced sites:', cloudSites.length);
                setSites(cloudSites);
            },
            (error) => {
                console.error('Error fetching sites from Firebase:', error);
            }
        );

        // 3. Sync Employees
        const unsubEmployees = onSnapshot(
            collection(db, 'employees'),
            (snap) => {
                const cloudEmployees = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log('[GlobalDataContext] Synced employees:', cloudEmployees.length);
                setEmployees(cloudEmployees);
            },
            (error) => {
                console.error('Error fetching employees from Firebase:', error);
            }
        );

        setLoading(false);

        return () => {
            unsubCustomers();
            unsubSites();
            unsubEmployees();
        };
    }, []);

    // --- AUTO-REPAIR ORPHANED SITES ---
    // This finds sites that have a 'customer' name string but no 'customerId' link
    // and automatically creates or links the customer.
    useEffect(() => {
        if (loading || sites.length === 0 || isRepairing) return;

        const repairOrphans = async () => {
            const orphans = sites.filter(s => !s.customerId && s.customer);

            if (orphans.length === 0) return;

            console.log(`[GlobalData] Found ${orphans.length} orphaned sites. Starting repair...`);
            setIsRepairing(true);

            // Group orphans by customer name to avoid creating duplicates
            const orphansByCustomer = orphans.reduce((acc, site) => {
                const name = site.customer.trim();
                if (!acc[name]) acc[name] = [];
                acc[name].push(site);
                return acc;
            }, {});

            for (const [customerName, siteList] of Object.entries(orphansByCustomer)) {
                try {
                    // 1. Check if customer already exists (case-insensitive)
                    let targetCustomer = customers.find(c =>
                        c.name.toLowerCase() === customerName.toLowerCase()
                    );

                    // 2. If not, create it
                    if (!targetCustomer) {
                        const newId = `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                        const newCustomer = {
                            id: newId,
                            name: customerName,
                            contacts: [],
                            createdAt: new Date().toISOString(),
                            autoCreated: true // Flag to know it was auto-generated
                        };
                        await setDoc(doc(db, 'customers', newId), newCustomer);
                        targetCustomer = newCustomer;
                        console.log(`[GlobalData] Auto-created customer: ${customerName}`);
                    }

                    // 3. Link all sites to this customer
                    for (const site of siteList) {
                        await updateDoc(doc(db, 'sites', site.id), {
                            customerId: targetCustomer.id,
                            customer: targetCustomer.name // Ensure name matches exactly
                        });
                        console.log(`[GlobalData] Linked site ${site.name} to customer ${targetCustomer.name}`);
                    }
                } catch (error) {
                    console.error(`[GlobalData] Error repairing customer ${customerName}:`, error);
                }
            }
            setIsRepairing(false);
        };

        // Run repair with a small delay to ensure state is stable
        const timer = setTimeout(repairOrphans, 2000);
        return () => clearTimeout(timer);
    }, [sites.length, customers.length, loading]);

    // --- CUSTOMER ACTIONS ---

    const addCustomer = async (data) => {
        const id = `cust-${Date.now()}`;
        const newCustomer = {
            id,
            contacts: [],
            ...data,
            createdAt: new Date().toISOString()
        };
        try {
            await setDoc(doc(db, 'customers', id), newCustomer);
            console.log('[GlobalDataContext] Customer created:', id);
            return id;
        } catch (e) {
            console.error('Error creating customer:', e);
            alert('Failed to create customer.');
            return null;
        }
    };

    const updateCustomer = async (id, data) => {
        try {
            await updateDoc(doc(db, 'customers', id), data);
            console.log('[GlobalDataContext] Customer updated:', id);
        } catch (e) {
            console.error('Error updating customer:', e);
            alert('Failed to update customer.');
        }
    };

    const deleteCustomer = async (id) => {
        // Check for linked sites first to prevent orphans
        const linkedSites = sites.filter(s => s.customerId === id);
        if (linkedSites.length > 0) {
            alert(`Cannot delete customer. They have ${linkedSites.length} active sites.`);
            return;
        }

        const customer = customers.find(c => c.id === id);
        const customerName = customer ? customer.name : 'this customer';
        if (!window.confirm(`Are you sure you want to delete "${customerName}"? This action cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, 'customers', id));
            console.log('[GlobalDataContext] Customer deleted:', id);
        } catch (e) {
            console.error('Error deleting customer:', e);
            alert('Failed to delete customer.');
        }
    };

    // --- CONTACT ACTIONS (Sub-entity of Customer) ---

    const addContactToCustomer = async (customerId, contactData) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            console.error('Customer not found:', customerId);
            return;
        }

        const newContact = {
            id: `cont-${Date.now()}`,
            siteIds: [], // Track which sites this contact manages
            ...contactData
        };
        const updatedContacts = [...(customer.contacts || []), newContact];

        try {
            await updateDoc(doc(db, 'customers', customerId), { contacts: updatedContacts });
            console.log('[GlobalDataContext] Contact added to customer:', customerId);
        } catch (e) {
            console.error('Error adding contact:', e);
            alert('Failed to add contact.');
        }
    };

    const updateCustomerContact = async (customerId, contactId, updatedData) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const updatedContacts = (customer.contacts || []).map(c =>
            c.id === contactId ? { ...c, ...updatedData } : c
        );

        try {
            await updateDoc(doc(db, 'customers', customerId), { contacts: updatedContacts });
            console.log('[GlobalDataContext] Contact updated:', contactId);
        } catch (e) {
            console.error('Error updating contact:', e);
            alert('Failed to update contact.');
        }
    };

    const deleteCustomerContact = async (customerId, contactId) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const contact = customer.contacts?.find(c => c.id === contactId);
        const contactName = contact ? contact.name : 'this contact';
        if (!window.confirm(`Are you sure you want to delete "${contactName}"?`)) return;

        const updatedContacts = (customer.contacts || []).filter(c => c.id !== contactId);

        try {
            await updateDoc(doc(db, 'customers', customerId), { contacts: updatedContacts });
            console.log('[GlobalDataContext] Contact deleted:', contactId);
        } catch (e) {
            console.error('Error deleting contact:', e);
            alert('Failed to delete contact.');
        }
    };

    // --- SITE ACTIONS (Linked to Customer) ---

    const addSite = async (customerId, siteData) => {
        const id = `site-${Date.now()}`;
        const customer = customers.find(c => c.id === customerId);
        const newSite = {
            id,
            customerId, // THE LINK
            ...siteData,
            logo: siteData.logo || customer?.logo || null, // Inherit customer logo if not provided
            serviceData: [],
            rollerData: [],
            specData: [],
            issues: [],
            notes: [],
            active: true
        };

        try {
            await setDoc(doc(db, 'sites', id), newSite);
            console.log('[GlobalDataContext] Site created:', id);
            return id;
        } catch (e) {
            console.error('Error creating site:', e);
            alert('Failed to create site.');
            return null;
        }
    };

    const updateSite = async (siteId, data) => {
        try {
            await updateDoc(doc(db, 'sites', siteId), data);
            console.log('[GlobalDataContext] Site updated:', siteId);
        } catch (e) {
            console.error('Error updating site:', e);
            alert('Failed to update site.');
        }
    };

    const addCustomerNote = async (customerId, noteContent, noteAuthor) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            console.error('Customer not found:', customerId);
            return;
        }

        const newNote = {
            id: `note-${Date.now()}`,
            content: noteContent,
            author: noteAuthor || 'Unknown',
            timestamp: new Date().toISOString(),
            archived: false
        };
        const updatedNotes = [...(customer.notes || []), newNote];

        try {
            await updateDoc(doc(db, 'customers', customerId), { notes: updatedNotes });
            console.log('[GlobalDataContext] Note added to customer:', customerId);
        } catch (e) {
            console.error('Error adding note:', e);
            alert('Failed to add note.');
        }
    };

    const updateCustomerNote = async (customerId, noteId, updatedContent) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const updatedNotes = (customer.notes || []).map(n =>
            n.id === noteId ? { ...n, content: updatedContent, lastEdited: new Date().toISOString() } : n
        );

        try {
            await updateDoc(doc(db, 'customers', customerId), { notes: updatedNotes });
            console.log('[GlobalDataContext] Note updated:', noteId);
        } catch (e) {
            console.error('Error updating note:', e);
            alert('Failed to update note.');
        }
    };

    const deleteCustomerNote = async (customerId, noteId) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;

        const updatedNotes = (customer.notes || []).filter(n => n.id !== noteId);

        try {
            await updateDoc(doc(db, 'customers', customerId), { notes: updatedNotes });
            console.log('[GlobalDataContext] Note deleted:', noteId);
        } catch (e) {
            console.error('Error deleting note:', e);
            alert('Failed to delete note.');
        }
    };

    const archiveCustomerNote = async (customerId, noteId, isArchived) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;

        const updatedNotes = (customer.notes || []).map(n =>
            n.id === noteId ? { ...n, archived: !isArchived } : n
        );

        try {
            await updateDoc(doc(db, 'customers', customerId), { notes: updatedNotes });
            console.log('[GlobalDataContext] Note archived status toggled:', noteId);
        } catch (e) {
            console.error('Error archiving note:', e);
            alert('Failed to archive note.');
        }
    };

    const getSitesByCustomer = (customerId) => sites.filter(s => s.customerId === customerId);

    const getCustomerById = (customerId) => customers.find(c => c.id === customerId);

    return (
        <GlobalDataContext.Provider value={{
            customers,
            sites,
            employees,
            loading,
            addCustomer,
            updateCustomer,
            deleteCustomer,
            addContactToCustomer,
            updateCustomerContact,
            deleteCustomerContact,
            addSite,
            updateSite,
            addCustomerNote,
            updateCustomerNote,
            deleteCustomerNote,
            archiveCustomerNote,
            getSitesByCustomer,
            getCustomerById
        }}>
            {children}
        </GlobalDataContext.Provider>
    );
};

export const useGlobalData = () => {
    const context = useContext(GlobalDataContext);
    if (!context) {
        throw new Error('useGlobalData must be used within GlobalDataProvider');
    }
    return context;
};
