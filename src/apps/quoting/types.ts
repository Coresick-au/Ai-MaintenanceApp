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
}

export interface Contact {
    name: string;
    phone: string;
    email: string;
}

export interface Customer {
    id: string;
    name: string;
    rates: Rates;
    contacts: Contact[]; // List of main contacts with name, phone, email
}

export interface JobDetails {
    customer: string;
    jobNo: string;
    location: string;
    techName: string; // Legacy field
    technicians: string[];
    description: string;
    reportingTime: number; // hours
    includeTravelCharge: boolean;
    travelDistance: number; // km
    quotedAmount?: number;
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
