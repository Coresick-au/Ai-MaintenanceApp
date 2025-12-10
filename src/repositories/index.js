import { QuoteRepository } from './QuoteRepository';
import { CustomerRepository } from './CustomerRepository';
import { SiteRepository } from './SiteRepository';
import { EmployeeRepository } from './EmployeeRepository';

// Singleton instances - use these throughout the app
export const quoteRepository = new QuoteRepository();
export const customerRepository = new CustomerRepository();
export const siteRepository = new SiteRepository();
export const employeeRepository = new EmployeeRepository();

// Export classes for testing or custom instances
export { QuoteRepository, CustomerRepository, SiteRepository, EmployeeRepository };
export { BaseRepository } from './BaseRepository';
