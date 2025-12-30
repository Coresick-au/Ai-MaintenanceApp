import { ProductCompositionRepository } from './ProductCompositionRepository';
import { BaseRepository } from './BaseRepository';
import { CustomerRepository } from './CustomerRepository';
import { SiteRepository } from './SiteRepository';
import { EmployeeRepository } from './EmployeeRepository';
import { PartCostHistoryRepository } from './PartCostHistoryRepository';
import { ProductCostHistoryRepository } from './ProductCostHistoryRepository';
import { ProductRepository } from './ProductRepository';
import { QuoteRepository } from './QuoteRepository';
import { BuildGuideRepository } from './BuildGuideRepository';

// Singleton instances - use these throughout the app
export const productCompositionRepository = new ProductCompositionRepository();
export const customerRepository = new CustomerRepository();
export const siteRepository = new SiteRepository();
export const employeeRepository = new EmployeeRepository();
export const partCostHistoryRepository = new PartCostHistoryRepository();
export const productCostHistoryRepository = new ProductCostHistoryRepository();
export const productRepository = new ProductRepository();
export const quoteRepository = new QuoteRepository();
export const buildGuideRepository = new BuildGuideRepository();

// Export classes for testing or custom instances
export {
    ProductCompositionRepository,
    BaseRepository,
    CustomerRepository,
    SiteRepository,
    EmployeeRepository,
    PartCostHistoryRepository,
    ProductCostHistoryRepository,
    ProductRepository,
    QuoteRepository,
    BuildGuideRepository
};
