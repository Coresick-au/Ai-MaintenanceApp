import React, { useState, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import QuoteBuilder from './components/QuoteBuilder/QuoteBuilder';
import RatesConfig from './components/RatesConfig';
import Summary from './components/Summary';
import CustomerDashboard from './components/CustomerDashboard';
import BackupRestore from './components/BackupRestore';
import { useQuote } from './hooks/useQuote';

// Lazy load the Dashboard for performance
const Dashboard = lazy(() => import('./components/Dashboard'));

export const QuotingWrapper = ({ onBack }: { onBack: () => void }) => {
    const [activeTab, setActiveTab] = useState('quote');
    const quote = useQuote();

    // Exit App Handler
    const handleExit = () => {
        onBack();
    };

    if (!quote.activeQuoteId) {
        return (
            <div className="relative">
                {/* Exit Button provided by Wrapper */}
                <div className="fixed top-4 right-4 z-50 print:hidden">
                    <button
                        onClick={handleExit}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors flex items-center gap-2 font-bold text-sm border border-slate-700"
                    >
                        <span>✕</span> Exit Quoting
                    </button>
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
                {/* Floating Home Button - Bottom Right */}
                <button
                    onClick={onBack}
                    className="fixed bottom-4 right-4 z-[9999] p-3 bg-slate-800 border border-slate-600 rounded-full shadow-2xl text-cyan-400 hover:bg-slate-700 hover:text-white transition-all hover:scale-110 print:hidden"
                    title="Return to App Portal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="7" height="7" x="3" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="14" rx="1" />
                        <rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                </button>
            </div>
        );
    }

    const customerName = quote.jobDetails.customer;

    return (
        <div className="relative">
            {/* Exit Button provided by Wrapper (Overlay) */}
            <div className="fixed top-4 right-4 z-[60] print:hidden">
                <button
                    onClick={handleExit}
                    className="bg-slate-900/80 backdrop-blur text-white px-3 py-1.5 rounded-lg shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-bold text-xs border border-slate-700"
                >
                    <span>✕</span> Exit
                </button>
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
            {/* Floating Home Button - Bottom Right */}
            <button
                onClick={onBack}
                className="fixed bottom-4 right-4 z-[9999] p-3 bg-slate-800 border border-slate-600 rounded-full shadow-2xl text-cyan-400 hover:bg-slate-700 hover:text-white transition-all hover:scale-110 print:hidden"
                title="Return to App Portal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
            </button>
        </div>
    );
};
