import { useState, useEffect } from 'react';
import type { Rates, JobDetails, Shift, ExtraItem, Quote, Customer, Status, InternalExpense } from '../types';
import { calculateShiftBreakdown as calculateLogic } from '../logic';
// @ts-ignore
import { useGlobalData } from '../../../context/GlobalDataContext';


export const DEFAULT_RATES: Rates = {
    siteNormal: 160,
    siteOvertime: 190,
    weekend: 210,
    publicHoliday: 235,
    officeReporting: 160,
    travel: 75,
    travelOvertime: 112,
    travelCharge: 1.10,
    travelChargeExBrisbane: 0,
    vehicle: 120,
    perDiem: 90,
    standardDayRate: 2055,
    weekendDayRate: 2520,
    costOfLabour: 100,
    rateNotes: 'Ex Banyo',
};

const DEFAULT_JOB_DETAILS: JobDetails = {
    customer: '',
    jobNo: '',
    location: '',
    techName: '',
    technicians: ['Tech 1'],
    description: '',
    reportingTime: 0,
    includeTravelCharge: false,
    travelDistance: 0,
    quotedAmount: 0,
    varianceReason: '',
    externalLink: '',
    adminComments: ''
};

const DEFAULT_SHIFTS: Shift[] = [
    {
        id: 1,
        date: new Date().toISOString().split('T')[0],
        dayType: 'weekday',
        startTime: '06:00',
        finishTime: '18:00',
        travelIn: 0.5,
        travelOut: 0.5,
        vehicle: false,
        perDiem: false,
        tech: 'Tech 1',
        isNightShift: false
    }
];

const QUOTES_STORAGE_KEY = 'service-quoter-quotes';
// const CUSTOMERS_STORAGE_KEY = 'service-quoter-customers'; // Removed
const TECHNICIANS_STORAGE_KEY = 'service-quoter-technicians';
const DEFAULT_RATES_STORAGE_KEY = 'service-quoter-default-rates';

export function useQuote() {
    // Global State
    const {
        customers,
        addCustomer: addGlobalCustomer,
        updateCustomer: updateGlobalCustomer,
        deleteCustomer: deleteGlobalCustomer,
    } = useGlobalData(); // Use Global Data Context

    const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
    // const [savedCustomers, setSavedCustomers] = useState<Customer[]>([]); // Removed local state
    const [savedTechnicians, setSavedTechnicians] = useState<string[]>([]);
    const [savedDefaultRates, setSavedDefaultRates] = useState<Rates>(DEFAULT_RATES);
    const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Active Quote State
    const [status, setStatus] = useState<Status>('draft');
    const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
    const [jobDetails, setJobDetails] = useState<JobDetails>(DEFAULT_JOB_DETAILS);
    const [shifts, setShifts] = useState<Shift[]>(DEFAULT_SHIFTS);
    const [extras, setExtras] = useState<ExtraItem[]>([{ id: 1, description: 'Accommodation', cost: 0 }]);
    const [internalExpenses, setInternalExpenses] = useState<InternalExpense[]>([]);

    // Load from local storage on mount (Quotes, Techs, Default Rates only)
    useEffect(() => {
        const savedQ = localStorage.getItem(QUOTES_STORAGE_KEY);
        // const savedC = localStorage.getItem(CUSTOMERS_STORAGE_KEY); // Removed
        const savedT = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
        const savedDR = localStorage.getItem(DEFAULT_RATES_STORAGE_KEY);

        if (savedQ) {
            try {
                setSavedQuotes(JSON.parse(savedQ));
            } catch (e) {
                console.error("Failed to load quotes", e);
            }
        }

        // Customers loaded via GlobalContext

        if (savedT) {
            try {
                setSavedTechnicians(JSON.parse(savedT));
            } catch (e) {
                console.error("Failed to load technicians", e);
            }
        }

        if (savedDR) {
            try {
                const loadedRates = JSON.parse(savedDR);
                setSavedDefaultRates(loadedRates);
            } catch (e) {
                console.error("Failed to load default rates", e);
            }
        }

        setIsLoaded(true);
    }, []);

    // Save lists to local storage
    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(savedQuotes));
    }, [savedQuotes, isLoaded]);

    // Customers saved via GlobalContext

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(savedTechnicians));
    }, [savedTechnicians, isLoaded]);

    useEffect(() => {
        if (!isLoaded) return;
        localStorage.setItem(DEFAULT_RATES_STORAGE_KEY, JSON.stringify(savedDefaultRates));
    }, [savedDefaultRates, isLoaded]);

    // Auto-save active quote to list
    useEffect(() => {
        if (!activeQuoteId || !isLoaded) return;

        setSavedQuotes(prev => prev.map(q =>
            q.id === activeQuoteId
                ? { ...q, status, rates, jobDetails, shifts, extras, internalExpenses, lastModified: Date.now() }
                : q
        ));
    }, [status, rates, jobDetails, shifts, extras, internalExpenses, activeQuoteId, isLoaded]);

    const createNewQuote = () => {
        const newId = crypto.randomUUID();

        // Auto-increment Quote Number
        const maxQuoteNum = savedQuotes.reduce((max, q) => {
            const num = parseInt(q.quoteNumber || '0', 10);
            return num > max ? num : max;
        }, 0);
        const nextQuoteNum = (maxQuoteNum + 1).toString().padStart(4, '0');

        const newQuote: Quote = {
            id: newId,
            quoteNumber: nextQuoteNum,
            lastModified: Date.now(),
            status: 'draft',
            rates: savedDefaultRates, // Use saved defaults for new quotes
            jobDetails: DEFAULT_JOB_DETAILS,
            shifts: DEFAULT_SHIFTS,
            extras: [{ id: 1, description: 'Accommodation', cost: 0 }],
            internalExpenses: []
        };
        setSavedQuotes([...savedQuotes, newQuote]);
        loadQuote(newId, newQuote);
    };

    const loadQuote = (id: string, quoteData?: Quote) => {
        const quote = quoteData || savedQuotes.find(q => q.id === id);
        if (!quote) return;

        setActiveQuoteId(id);
        setStatus(quote.status);
        setRates(quote.rates);
        setJobDetails(quote.jobDetails);
        setShifts(quote.shifts);
        setExtras(quote.extras);
        setInternalExpenses(quote.internalExpenses || []);
    };

    const deleteQuote = (id: string) => {
        setSavedQuotes(savedQuotes.filter(q => q.id !== id));
        if (activeQuoteId === id) {
            setActiveQuoteId(null);
        }
    };

    const exitQuote = () => {
        setActiveQuoteId(null);
    };

    // Customer Management (Wrapper around Global Data)
    const saveCustomer = async (customer: Customer) => {
        const exists = customers.find((c: any) => c.id === customer.id);

        // Ensure rates object is clean and correctly structured
        const customerData = {
            name: customer.name,
            rates: customer.rates || DEFAULT_RATES, // Ensure rates exist
            contacts: customer.contacts || [],
            customerNotes: customer.customerNotes || '',
            isLocked: customer.isLocked || false
        };

        if (exists) {
            await updateGlobalCustomer(customer.id, customerData);
        } else {
            // New Customer - Global Context handles ID generation if not provided,
            // but our UI might generate one. Let's pass data.
            // If ID is a temp ID (crypto), we might want to let Firebase generate one,
            // but CustomerDashboard relies on the ID.
            // GlobalContext `addCustomer` generates its own ID 'cust-timestamp'.
            // The CustomerDashboard logic might need adjustment if it expects the ID to persist immediately.
            // Actually, we can check if it's a new 'temp' ID.
            // But simplify: Just call addCustomer with data using the ID we have or let it generate.

            // Note: GlobalContext `addCustomer(data)` generates a NEW ID.
            // If we want to preserve the ID generated by the UI (if valid), we might need to modify GlobalContext
            // OR accept that the ID changes.
            // Better: Let GlobalContext generate ID. Logic in UI will refresh list automatically.
            await addGlobalCustomer(customerData);
        }
    };

    const deleteCustomer = async (id: string) => {
        await deleteGlobalCustomer(id);
    };

    // Technician Management
    const saveTechnician = (name: string) => {
        if (!savedTechnicians.includes(name)) {
            setSavedTechnicians([...savedTechnicians, name]);
        }
    };

    const deleteTechnician = (name: string) => {
        setSavedTechnicians(savedTechnicians.filter(t => t !== name));
    };

    // Default Rates Management
    const saveAsDefaults = (newRates: Rates) => {
        setSavedDefaultRates(newRates);
    };

    const resetToDefaults = () => {
        setRates(savedDefaultRates);
    };

    const isLocked = status === 'quoted' || status === 'closed';

    // Helpers
    // Bridge to our verified logic
    const calculateShiftBreakdown = (shift: Shift) => {
        // We pass the current 'rates' state to the pure logic function
        return calculateLogic(shift, rates);
    };

    const reportingCost = (jobDetails.reportingTime || 0) * rates.officeReporting;

    const travelChargeCost = (rates.travelChargeExBrisbane || 0) * jobDetails.technicians.length;

    const totalCost = shifts.reduce((acc, shift) => acc + (calculateShiftBreakdown(shift).cost || 0), 0) +
        extras.reduce((acc, item) => acc + (item.cost || 0), 0) +
        (reportingCost || 0) +
        (travelChargeCost || 0);

    const totalHours = shifts.reduce((acc, shift) => acc + calculateShiftBreakdown(shift).breakdown.totalHours, 0);

    // Calculate total hours across all shifts
    const totalNTHrs = shifts.reduce((acc, shift) => {
        const { breakdown } = calculateShiftBreakdown(shift);
        return acc + breakdown.siteNT + breakdown.travelInNT + breakdown.travelOutNT;
    }, 0);

    const totalOTHrs = shifts.reduce((acc, shift) => {
        const { breakdown } = calculateShiftBreakdown(shift);
        return acc + breakdown.siteOT + breakdown.travelInOT + breakdown.travelOutOT;
    }, 0);

    // Actions
    const addShift = () => {
        if (isLocked) return;
        const newId = shifts.length > 0 ? Math.max(...shifts.map(s => s.id)) + 1 : 1;
        const lastShift = shifts.length > 0 ? shifts[shifts.length - 1] : null;

        const lastDate = lastShift ? new Date(lastShift.date) : new Date();
        if (lastShift) lastDate.setDate(lastDate.getDate() + 1);

        const prevStart = lastShift ? lastShift.startTime : '06:00';
        const prevFinish = lastShift ? lastShift.finishTime : '18:00';
        const prevTech = lastShift ? lastShift.tech : (jobDetails.technicians[0] || 'Tech 1');

        const dayOfWeek = lastDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        setShifts([...shifts, {
            id: newId,
            date: lastDate.toISOString().split('T')[0],
            dayType: isWeekend ? 'weekend' : 'weekday',
            startTime: prevStart,
            finishTime: prevFinish,
            travelIn: 0.5,
            travelOut: 0.5,
            vehicle: false,
            perDiem: false,
            tech: prevTech,
            isNightShift: false
        }]);
    };

    const updateShift = (id: number, field: keyof Shift, value: any) => {
        if (isLocked) return;
        setShifts(shifts.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const removeShift = (id: number) => {
        if (isLocked) return;
        setShifts(shifts.filter(s => s.id !== id));
    };

    const addExtra = () => {
        if (isLocked) return;
        setExtras([...extras, { id: Date.now(), description: '', cost: 0 }]);
    };

    const updateExtra = (id: number, field: keyof ExtraItem, value: any) => {
        if (isLocked) return;
        setExtras(extras.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const removeExtra = (id: number) => {
        if (isLocked) return;
        setExtras(extras.filter(e => e.id !== id));
    };

    const renameTechnician = (index: number, newName: string) => {
        if (isLocked) return;
        const oldName = jobDetails.technicians[index];

        // Update technician name in jobDetails
        const newTechs = [...jobDetails.technicians];
        newTechs[index] = newName;
        setJobDetails({ ...jobDetails, technicians: newTechs });

        // Sync all shifts that have the old name
        setShifts(shifts.map(s =>
            s.tech === oldName ? { ...s, tech: newName } : s
        ));
    };

    const exportState = () => {
        const state = {
            savedQuotes,
            savedCustomers: customers, // Use global customers
            savedDefaultRates,
            savedTechnicians,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const dateStr = new Date().toISOString().split('T')[0];
        link.download = `${dateStr}_AI-ServiceQuoterBackup_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const importState = (fileContent: string) => {
        try {
            const state = JSON.parse(fileContent);

            if (state.savedQuotes && Array.isArray(state.savedQuotes)) {
                setSavedQuotes(state.savedQuotes);
            }

            // Note: We deliberately DO NOT overwrite global customers from import
            // to prevent overwriting the shared database with old local backup data.
            // if (state.savedCustomers && Array.isArray(state.savedCustomers)) {
            //     setSavedCustomers(state.savedCustomers);
            // }

            if (state.savedDefaultRates && typeof state.savedDefaultRates === 'object') {
                setSavedDefaultRates(state.savedDefaultRates);
            }

            if (state.savedTechnicians && Array.isArray(state.savedTechnicians)) {
                setSavedTechnicians(state.savedTechnicians);
            }

            return true;
        } catch (error) {
            console.error('Failed to import state:', error);
            return false;
        }
    };


    return {
        // Global
        savedQuotes,
        savedCustomers: customers as Customer[], // Map global users to return object
        savedTechnicians,
        savedDefaultRates,
        activeQuoteId,
        createNewQuote,
        loadQuote,
        deleteQuote,
        exitQuote,
        saveCustomer,
        deleteCustomer,
        saveTechnician,
        deleteTechnician,
        saveAsDefaults,
        resetToDefaults,

        // Backup/Restore
        exportState,
        importState,

        // Active Quote
        status,
        setStatus,
        rates,
        setRates,
        jobDetails,
        setJobDetails,
        shifts,
        addShift,
        updateShift,
        removeShift,
        extras,
        addExtra,
        updateExtra,
        removeExtra,
        internalExpenses,
        setInternalExpenses,
        renameTechnician,

        // Calculations
        calculateShiftBreakdown,
        totalCost,
        totalNTHrs,
        totalOTHrs,
        reportingCost,
        travelChargeCost,
        totalHours,
        isLocked
    };
}
