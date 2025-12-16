export type Status = 'draft' | 'quoted' | 'invoice' | 'closed';

export interface Rates {
    siteNormal: number;
    siteOvertime: number;
    weekend: number;
    publicHoliday: number;
    officeReporting: number;
    travel: number;
    travelOvertime: number;
    travelCharge: number; // per km
    travelChargeExBrisbane: number; // per km
    vehicle: number; // per day
    perDiem: number; // per night
    standardDayRate: number; // 12hrs
    weekendDayRate: number; // 12hrs
    costOfLabour: number; // internal cost per hour for margin calculation
    rateNotes: string; // Notes specific to the rate setup (e.g., Charge Origin)
    overtimeThreshold: number; // hours before overtime kicks in (default 7.5)
    standardExpenses?: ExpenseTemplate[]; // standard recurring expenses for this customer
}

export interface ExpenseTemplate {
    id: string;
    description: string;
    cost: number;
}

export interface Contact {
    name: string;
    phone: string;
    email: string;
}

export interface ManagedSite {
    id: string;
    name: string;
    location: string;
    logo?: string;
    contacts: Contact[];
    rates?: Rates; // Site-specific rates (optional, falls back to customer rates)
    isLocked?: boolean; // Site-specific lock state (optional, falls back to customer lock state)
}

export interface Customer {
    id: string;
    name: string;
    logo?: string; // URL to customer logo from Customer Portal
    rates: Rates;
    contacts: Contact[]; // List of main contacts with name, phone, email
    customerNotes?: string; // Notes about the customer (e.g., special requirements, billing info)
    isLocked?: boolean; // Lock state for customer editing
    managedSites?: ManagedSite[]; // Managed sites for this customer
    hasAIMMProfile?: boolean; // AIMM monitoring status (for reference only)
}

export interface JobDetails {
    customer: string;
    jobNo: string;
    location: string;
    techName: string; // Legacy field
    technicians: string[];
    description: string;
    techNotes?: string; // Technician-specific instructions for job sheet
    reportingTime: number; // hours
    includeTravelCharge: boolean;
    travelDistance: number; // km
    originalQuoteAmount?: number; // Auto-captured when status changes to 'quoted'
    poAmount?: number; // Manually entered PO value
    varianceReason?: string;
    externalLink?: string;
    adminComments?: string;
}

export interface Shift {
    id: number;
    date: string;
    dayType: 'weekday' | 'weekend' | 'publicHoliday';
    startTime: string;
    finishTime: string;
    travelIn: number;
    travelOut: number;
    vehicle: boolean;
    perDiem: boolean;
    tech: string;
    isNightShift?: boolean;
}

export interface ExtraItem {
    id: number;
    description: string;
    cost: number;
}

export interface ShiftBreakdown {
    travelInNT: number;
    travelInOT: number;
    siteNT: number;
    siteOT: number;
    travelOutNT: number;
    travelOutOT: number;
    totalHours: number;
    siteHours: number;
}

export interface CalculatedShift {
    cost: number;
    breakdown: ShiftBreakdown;
}

export interface InternalExpense {
    id: string;
    description: string;
    cost: number;
}

export interface Quote {
    id: string;
    quoteNumber: string;
    lastModified: number;
    status: Status;
    rates: Rates;
    jobDetails: JobDetails;
    shifts: Shift[];
    extras: ExtraItem[];
    internalExpenses: InternalExpense[];
}
