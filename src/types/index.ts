// Type definitions for the maintenance app
export interface Site {
  id: string;
  customer: string;
  name: string;
  location: string;
  type?: string;
  typeDetail?: string;
  contactName?: string;
  contactPosition?: string;
  contactEmail?: string;
  contactPhone1?: string;
  contactPhone2?: string;
  logo?: string;
  notes?: Note[];
  serviceData?: Asset[];
  rollerData?: Asset[];
  active?: boolean;
  opStatus?: string;
  opStatusNote?: string;
  opStatusTimestamp?: string;
  specifications?: Specification[];
}

export interface Asset {
  id: string;
  name: string;
  code: string;
  frequency: number;
  lastCal: string;
  dueDate: string;
  remaining: number;
  active?: boolean;
  opStatus?: string;
  notes?: string;
  calibrationData?: CalibrationData[];
  specifications?: AssetSpecification[];
}

export interface Note {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface Specification {
  id: string;
  category: string;
  title: string;
  value: string;
  unit?: string;
  timestamp: string;
  author: string;
}

export interface CalibrationData {
  id: string;
  date: string;
  technician: string;
  tare: number;
  span: number;
  linearity: number;
  repeatability: number;
  notes?: string;
}

export interface AssetSpecification {
  id: string;
  name: string;
  value: string;
  unit?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface SiteFormData {
  name?: string;
  customer?: string;
  location?: string;
  type?: string;
  typeDetail?: string;
  contactName?: string;
  contactPosition?: string;
  contactEmail?: string;
  contactPhone1?: string;
  contactPhone2?: string;
}

export interface AssetFormData {
  name?: string;
  code?: string;
  frequency?: string | number;
  lastCal?: string;
  notes?: string;
}

export interface ReportFormData {
  assetName?: string;
  technician?: string;
  date?: string;
  tare?: string | number;
  span?: string | number;
  linearity?: string | number;
  repeatability?: string | number;
  notes?: string;
}
