import { useState, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import QuoteBuilder from './components/QuoteBuilder/QuoteBuilder';
import RatesConfig from './components/RatesConfig';
import Summary from './components/Summary';
import CustomerDashboard from './components/CustomerDashboard';
import BackupRestore from './components/BackupRestore';
import { useQuote } from './hooks/useQuote';
import BackButton from '../../components/ui/BackButton';

// Lazy load the Dashboard for performance
const Dashboard = lazy(() => import('./components/Dashboard'));

export const QuotingWrapper = ({ onBack }: { onBack: () => void }) => {
    const [activeTab, setActiveTab] = useState('quote');
    const quote = useQuote();

    if (!quote.activeQuoteId) {
        return (
            <div className="relative">
                {/* Unified Back Button - Top Left */}
                <div className="fixed top-4 left-4 z-[9999] print:hidden">
                    <BackButton label="Back to Portal" onClick={onBack} />
                </div>
                <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-200">Loading Dashboard...</div>}>
                    <Dashboard
                        savedQuotes={quote.savedQuotes}
                        createNewQuote={quote.createNewQuote}
                        loadQuote={quote.loadQuote}
                        deleteQuote={quote.deleteQuote}
                        savedCustomers={quote.savedCustomers}
                        saveCustomer={quote.saveCustomer}
                        deleteCustomer={quote.deleteCustomer}
                        savedTechnicians={quote.savedTechnicians}
                        saveTechnician={quote.saveTechnician}
                        deleteTechnician={quote.deleteTechnician}
                        saveAsDefaults={quote.saveAsDefaults}
                        resetToDefaults={quote.resetToDefaults}
                        savedDefaultRates={quote.savedDefaultRates}
                        exportState={quote.exportState}
                        importState={quote.importState}
                    />
                </Suspense>
            </div>
        );
    }

    const customerName = quote.jobDetails.customer;

    return (
        <div className="relative">
            {/* Unified Back Button - Top Left */}
            <div className="fixed top-4 left-4 z-[9999] print:hidden">
                <BackButton label="Back to Portal" onClick={onBack} />
            </div>
            <Layout
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                status={quote.status}
                totalCost={quote.totalCost}
                exitQuote={quote.exitQuote}
                customerName={customerName}
            >
                {activeTab === 'quote' && <QuoteBuilder quote={quote} />}
                {activeTab === 'rates' && <RatesConfig rates={quote.rates} setRates={quote.setRates} isLocked={quote.isLocked} />}
                {activeTab === 'summary' && <Summary quote={quote} />}
                {activeTab === 'customers' && (
                    <CustomerDashboard
                        savedCustomers={quote.savedCustomers}
                        saveCustomer={quote.saveCustomer}
                        deleteCustomer={quote.deleteCustomer}
                        saveAsDefaults={quote.saveAsDefaults}
                        resetToDefaults={quote.resetToDefaults}
                        savedDefaultRates={quote.savedDefaultRates}
                    />
                )}
                {activeTab === 'backup' && (
                    <BackupRestore
                        exportState={quote.exportState}
                        importState={quote.importState}
                    />
                )}
            </Layout>
        </div>
    );
};
