import React, { createContext, useContext, useState, useEffect } from 'react';
import { customerRepository, siteRepository, employeeRepository } from '../repositories';

const GlobalDataContext = createContext();

export const GlobalDataProvider = ({ children }) => {
    const [customers, setCustomers] = useState([]);
    const [sites, setSites] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isRepairing, setIsRepairing] = useState(false);

    // --- SYNC FROM FIREBASE USING REPOSITORIES ---
    useEffect(() => {
        console.log('[GlobalDataContext] Initializing Repository Listeners...');

        // 1. Sync Customers
        const unsubCustomers = customerRepository.subscribe(
            [],
            (cloudCustomers) => {
                console.log('[GlobalDataContext] Synced customers:', cloudCustomers.length);
                setCustomers(cloudCustomers);
            },
            (error) => {
                console.error('Error fetching customers from Firebase:', error);
            }
        );

        // 2. Sync Sites
        const unsubSites = siteRepository.subscribe(
            [],
            (cloudSites) => {
                console.log('[GlobalDataContext] Synced sites:', cloudSites.length);
                setSites(cloudSites);
            },
            (error) => {
                console.error('Error fetching sites from Firebase:', error);
            }
        );

        // 3. Sync Employees
        const unsubEmployees = employeeRepository.subscribe(
            [],
            (cloudEmployees) => {
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
                    let targetCustomer = await customerRepository.findByName(customerName);

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
                        await customerRepository.create(newId, newCustomer);
                        targetCustomer = newCustomer;
                        console.log(`[GlobalData] Auto-created customer: ${customerName}`);
                    }

                    // 3. Link all sites to this customer
                    for (const site of siteList) {
                        await siteRepository.linkToCustomer(site.id, targetCustomer.id, targetCustomer.name);
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
            await customerRepository.create(id, newCustomer);
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
            await customerRepository.update(id, data);
            console.log('[GlobalDataContext] Customer updated:', id);
        } catch (e) {
            console.error('Error updating customer:', e);
            alert('Failed to update customer.');
        }
    };

    const deleteCustomer = async (id) => {
        // Check for linked legacy sites first
        const linkedSites = sites.filter(s => s.customerId === id);
        if (linkedSites.length > 0) {
            alert(`Cannot delete customer. They have ${linkedSites.length} active sites in the legacy sites collection.`);
            return;
        }

        // Check for managed sites
        const customer = customers.find(c => c.id === id);
        if (!customer) {
            alert('Customer not found.');
            return;
        }

        const managedSites = customer.managedSites || [];
        if (managedSites.length > 0) {
            alert(`Cannot delete "${customer.name}". They have ${managedSites.length} managed site(s).\n\nPlease delete all managed sites first before deleting the customer.`);
            return;
        }

        const customerName = customer.name;
        if (!window.confirm(`Are you sure you want to delete "${customerName}"? This action cannot be undone.`)) return;

        try {
            await customerRepository.delete(id);
            console.log('[GlobalDataContext] Customer deleted:', id);
        } catch (e) {
            console.error('Error deleting customer:', e);
            alert(`Failed to delete customer: ${e.message || 'Unknown error'}`);
        }
    };

    // --- CONTACT ACTIONS (Sub-entity of Customer) ---

    const addContactToCustomer = async (customerId, contactData) => {
        try {
            await customerRepository.addContact(customerId, contactData);
            console.log('[GlobalDataContext] Contact added to customer:', customerId);
        } catch (e) {
            console.error('Error adding contact:', e);
            alert('Failed to add contact.');
        }
    };

    const updateCustomerContact = async (customerId, contactId, updatedData) => {
        try {
            await customerRepository.updateContact(customerId, contactId, updatedData);
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

        try {
            await customerRepository.deleteContact(customerId, contactId);
            console.log('[GlobalDataContext] Contact deleted:', contactId);
        } catch (e) {
            console.error('Error deleting contact:', e);
            alert('Failed to delete contact.');
        }
    };

    // --- SITE ACTIONS (Linked to Customer) ---

    const addManagedSite = async (customerId, siteData) => {
        try {
            const newSite = await customerRepository.addManagedSite(customerId, siteData);
            console.log('[GlobalDataContext] Managed site created:', newSite.id);
            return newSite.id;
        } catch (e) {
            console.error('Error creating managed site:', e);
            alert('Failed to create managed site.');
            return null;
        }
    };

    const updateManagedSite = async (customerId, siteId, data) => {
        try {
            await customerRepository.updateManagedSite(customerId, siteId, data);
            console.log('[GlobalDataContext] Managed site updated:', siteId);
        } catch (e) {
            console.error('Error updating managed site:', e);
            alert('Failed to update managed site.');
        }
    };

    const deleteManagedSite = async (customerId, siteId) => {
        const customer = customers.find(c => c.id === customerId);
        const site = customer?.managedSites?.find(s => s.id === siteId);
        const siteName = site ? site.name : 'this site';
        if (!window.confirm(`Are you sure you want to delete "${siteName}"? This action cannot be undone.`)) return;

        try {
            await customerRepository.deleteManagedSite(customerId, siteId);
            console.log('[GlobalDataContext] Managed site deleted:', siteId);
        } catch (e) {
            console.error('Error deleting managed site:', e);
            alert('Failed to delete managed site.');
        }
    };

    // Move managed site to global sites collection (enable AIMM)
    const enableAIMMForSite = async (customerId, siteId) => {
        try {
            const customer = customers.find(c => c.id === customerId);
            const managedSite = customer?.managedSites?.find(s => s.id === siteId);

            if (!managedSite) {
                throw new Error('Managed site not found');
            }

            // Create site in global collection with AIMM enabled
            const globalSiteData = {
                name: managedSite.name,
                location: managedSite.location || '',
                customer: customer.name,
                customerId: customerId,
                logo: managedSite.logo || customer.logo || null,
                active: true,
                hasAIMMProfile: true // Enable AIMM
            };

            // Create in global sites collection
            await siteRepository.create(siteId, globalSiteData);

            // Remove from customer's managed sites
            await customerRepository.deleteManagedSite(customerId, siteId);

            console.log('[GlobalDataContext] Site enabled for AIMM:', siteId);
        } catch (e) {
            console.error('Error enabling AIMM for site:', e);
            alert('Failed to enable AIMM for site.');
            throw e;
        }
    };

    // Legacy site methods for Maintenance App (AIMM) only
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
            active: true,
            hasAIMMProfile: false // Default to false for new sites
        };

        try {
            await siteRepository.create(id, newSite);
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
            await siteRepository.update(siteId, data);
            console.log('[GlobalDataContext] Site updated:', siteId);
        } catch (e) {
            console.error('Error updating site:', e);
            alert('Failed to update site.');
        }
    };

    const deleteSite = async (siteId) => {
        const site = sites.find(s => s.id === siteId);
        const siteName = site ? site.name : 'this site';
        if (!window.confirm(`Are you sure you want to delete "${siteName}"? This action cannot be undone.`)) return;

        try {
            await siteRepository.delete(siteId);
            console.log('[GlobalDataContext] Site deleted:', siteId);
        } catch (e) {
            console.error('Error deleting site:', e);
            alert('Failed to delete site.');
        }
    };

    const toggleSiteStatus = async (siteId) => {
        const site = sites.find(s => s.id === siteId);
        if (!site) return;

        const isArchiving = site.active !== false;
        const message = isArchiving
            ? `Are you sure you want to archive "${site.name}"?\n\nArchived sites are hidden by default but can be restored.`
            : `Are you sure you want to restore "${site.name}"?`;

        if (!window.confirm(message)) return;

        try {
            await siteRepository.toggleStatus(siteId);
            console.log('[GlobalDataContext] Site status toggled:', siteId);
        } catch (e) {
            console.error('Error toggling site status:', e);
            alert('Failed to update site status.');
        }
    };

    const addCustomerNote = async (customerId, noteContent, noteAuthor) => {
        try {
            await customerRepository.addNote(customerId, noteContent, noteAuthor);
            console.log('[GlobalDataContext] Note added to customer:', customerId);
        } catch (e) {
            console.error('Error adding note:', e);
            alert('Failed to add note.');
        }
    };

    const updateCustomerNote = async (customerId, noteId, updatedContent) => {
        try {
            await customerRepository.updateNote(customerId, noteId, updatedContent);
            console.log('[GlobalDataContext] Note updated:', noteId);
        } catch (e) {
            console.error('Error updating note:', e);
            alert('Failed to update note.');
        }
    };

    const deleteCustomerNote = async (customerId, noteId) => {
        if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;

        try {
            await customerRepository.deleteNote(customerId, noteId);
            console.log('[GlobalDataContext] Note deleted:', noteId);
        } catch (e) {
            console.error('Error deleting note:', e);
            alert('Failed to delete note.');
        }
    };

    const archiveCustomerNote = async (customerId, noteId, isArchived) => {
        try {
            await customerRepository.toggleNoteArchive(customerId, noteId, isArchived);
            console.log('[GlobalDataContext] Note archived status toggled:', noteId);
        } catch (e) {
            console.error('Error archiving note:', e);
            alert('Failed to archive note.');
        }
    };

    const getSitesByCustomer = (customerId) => sites.filter(s => s.customerId === customerId);

    const getCustomerById = (customerId) => customers.find(c => c.id === customerId);

    // Get orphaned sites (sites with issues in customer managed sites)
    const getOrphanedSites = () => {
        const orphaned = [];

        customers.forEach(customer => {
            const managedSites = customer.managedSites || [];
            managedSites.forEach(site => {
                // Site has issues if customer is archived
                if (!customer.active) {
                    orphaned.push({
                        ...site,
                        customerName: customer.name,
                        customerStatus: 'Archived',
                        customerId: customer.id,
                        isOrphaned: true,
                        issue: 'Customer is archived'
                    });
                }
            });
        });

        console.log('[Debug] Found sites with issues:', orphaned.map(s => ({ name: s.name, id: s.id, issue: s.issue })));
        return orphaned;
    };

    // Get all sites for Maintenance App (from customer managed sites)
    const getAllMaintenanceAppSites = () => {
        const allSites = [];
        customers.forEach(customer => {
            const managedSites = customer.managedSites || [];
            managedSites.forEach(site => {
                allSites.push({
                    ...site,
                    customerName: customer.name,
                    customerStatus: customer.active === false ? 'Archived' : 'Active',
                    customerId: customer.id,
                    isOrphaned: !customer.active
                });
            });
        });
        return allSites;
    };

    // Delete site from customer managed sites
    const deleteOrphanedSite = async (siteId) => {
        // Find the site and its customer
        let targetSite = null;
        let targetCustomerId = null;

        customers.forEach(customer => {
            const site = (customer.managedSites || []).find(s => s.id === siteId);
            if (site) {
                targetSite = site;
                targetCustomerId = customer.id;
            }
        });

        if (!targetSite) {
            console.error('Site not found:', siteId);
            alert('Site not found.');
            return;
        }

        const siteName = targetSite.name;
        if (!window.confirm(`⚠️ WARNING: This will permanently delete "${siteName}" from the customer's managed sites.\n\nThis action cannot be undone. Are you sure?`)) return;

        try {
            await deleteManagedSite(targetCustomerId, siteId);
            console.log('[GlobalDataContext] Managed site deleted:', siteId);
        } catch (e) {
            console.error('Error deleting managed site:', e);
            alert('Failed to delete site.');
        }
    };

    // Get all legacy global sites (for cleanup)
    const getLegacyGlobalSites = () => {
        return sites.map(site => {
            const customer = customers.find(c => c.id === site.customerId);
            return {
                ...site,
                customerStatus: customer ? (customer.active === false ? 'Archived' : 'Active') : 'Not Found',
                customerName: customer?.name || site.customer || 'Unknown',
                isOrphaned: !site.customerId || !customer || customer?.active === false
            };
        });
    };

    // Delete legacy global site
    const deleteLegacySite = async (siteId) => {
        const site = sites.find(s => s.id === siteId);
        const siteName = site ? site.name : 'this site';
        if (!window.confirm(`⚠️ WARNING: This will permanently delete "${siteName}" from the legacy global sites collection.\n\nThis action cannot be undone. Are you sure?`)) return;

        try {
            await siteRepository.delete(siteId);
            console.log('[GlobalDataContext] Legacy site deleted:', siteId);
        } catch (e) {
            console.error('Error deleting legacy site:', e);
            alert('Failed to delete legacy site.');
        }
    };

    // --- EMPLOYEE ACTIONS ---

    const addEmployee = async (data) => {
        const id = `emp-${Date.now()}`;
        const newEmployee = {
            id,
            ...data,
            status: data.status || 'active',
            certifications: data.certifications || [],
            siteInductions: data.siteInductions || [],
            createdAt: new Date().toISOString()
        };
        try {
            await employeeRepository.create(id, newEmployee);
            console.log('[GlobalDataContext] Employee created:', id);
            return id;
        } catch (e) {
            console.error('Error creating employee:', e);
            alert('Failed to create employee.');
            return null;
        }
    };

    const updateEmployee = async (id, data) => {
        try {
            await employeeRepository.update(id, data);
            console.log('[GlobalDataContext] Employee updated:', id);
        } catch (e) {
            console.error('Error updating employee:', e);
            alert('Failed to update employee.');
        }
    };

    const deleteEmployee = async (id) => {
        const employee = employees.find(e => e.id === id);
        const empName = employee ? employee.name : 'this employee';
        if (!window.confirm(`Are you sure you want to delete "${empName}"? All certifications and inductions will be permanently removed.`)) return;

        try {
            await employeeRepository.deleteEmployee(id);
            console.log('[GlobalDataContext] Employee deleted:', id);
        } catch (e) {
            console.error('Error deleting employee:', e);
            alert('Failed to delete employee.');
        }
    };

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
            // Managed sites (Customer Portal)
            addManagedSite,
            updateManagedSite,
            deleteManagedSite,
            enableAIMMForSite,
            // Legacy sites (Maintenance App)
            addSite,
            updateSite,
            deleteSite,
            toggleSiteStatus,
            // Site management functions
            getOrphanedSites,
            deleteOrphanedSite,
            getAllMaintenanceAppSites,
            // Legacy cleanup functions
            getLegacyGlobalSites,
            deleteLegacySite,
            addCustomerNote,
            updateCustomerNote,
            deleteCustomerNote,
            archiveCustomerNote,
            getSitesByCustomer,
            getCustomerById,
            addEmployee,
            updateEmployee,
            deleteEmployee
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
