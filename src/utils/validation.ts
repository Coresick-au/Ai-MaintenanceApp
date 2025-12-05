// Type definitions for form validation
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

// Validation utilities for the maintenance app

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phone.trim() === '' || (phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10);
};

export const validateDate = (dateString: string | boolean): boolean => {
  if (!dateString || dateString === true) return false;
  const date = new Date(String(dateString));
  return !isNaN(date.getTime()) && date <= new Date();
};

export const validateRequired = (value: string | boolean): boolean => {
  if (!value || value === true) return false;
  return String(value).trim().length > 0;
};

export const validateNumber = (value: string | number, min?: number, max?: number): boolean => {
  const num = parseInt(String(value));
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

export const validateAssetCode = (code: string | boolean): boolean => {
  // Asset codes should be alphanumeric with optional hyphens/underscores
  if (!code || code === true) return false;
  const codeRegex = /^[A-Za-z0-9\-_]+$/;
  return validateRequired(String(code)) && codeRegex.test(String(code));
};

export const validateSiteForm = (formData: SiteFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateRequired(formData.name || '')) {
    errors.name = 'Site name is required';
  }

  if (!validateRequired(formData.customer || '')) {
    errors.customer = 'Customer name is required';
  }

  if (!validateRequired(formData.location || '')) {
    errors.location = 'Location is required';
  }

  if (formData.contactEmail && !validateEmail(formData.contactEmail)) {
    errors.contactEmail = 'Invalid email address';
  }

  if (formData.contactPhone1 && !validatePhone(formData.contactPhone1)) {
    errors.contactPhone1 = 'Invalid phone number';
  }

  if (formData.contactPhone2 && !validatePhone(formData.contactPhone2)) {
    errors.contactPhone2 = 'Invalid phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateAssetForm = (formData: AssetFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateRequired(formData.name || '')) {
    errors.name = 'Asset name is required';
  }

  if (!validateAssetCode(formData.code || '')) {
    errors.code = 'Asset code must be alphanumeric (letters, numbers, hyphens, underscores only)';
  }

  if (!validateNumber(formData.frequency || '0', 1, 3650)) {
    errors.frequency = 'Frequency must be between 1 and 3650 days';
  }

  if (!validateDate(formData.lastCal || '')) {
    errors.lastCal = 'Last calibration date must be a valid date';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateReportForm = (formData: ReportFormData): ValidationResult => {
  const errors: Record<string, string> = {};

  if (!validateRequired(formData.assetName || '')) {
    errors.assetName = 'Asset name is required';
  }

  if (!validateRequired(formData.technician || '')) {
    errors.technician = 'Technician name is required';
  }

  if (!validateDate(formData.date || '')) {
    errors.date = 'Date must be a valid date';
  }

  if (!validateNumber(formData.tare || '0', -1000, 1000)) {
    errors.tare = 'Tare must be between -1000 and 1000';
  }

  if (!validateNumber(formData.span || '0', -1000, 1000)) {
    errors.span = 'Span must be between -1000 and 1000';
  }

  if (!validateNumber(formData.linearity || '0', -100, 100)) {
    errors.linearity = 'Linearity must be between -100 and 100';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const sanitizeAssetName = (name: string): string => {
  // Allow common characters but remove potentially harmful ones
  return name.trim().replace(/[<>\"'&]/g, '');
};

export const sanitizeNotes = (notes: string): string => {
  // Allow more characters in notes but still sanitize
  return notes.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};
