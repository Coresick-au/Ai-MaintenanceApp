import React from 'react';
import { ReportingApp } from './ReportingApp';
import { ReportingProvider } from './context/ReportingContext';
import { ReportingSettingsProvider } from './context/ReportingSettingsContext';
import { ReportingThemeProvider } from './context/ReportingThemeContext';
import { ErrorBoundary } from '../../components/UIComponents';

export const ReportingWrapper = ({ onBack }) => {
    return (
        <ErrorBoundary>
            <ReportingThemeProvider>
                <ReportingSettingsProvider>
                    <ReportingProvider>
                        <ReportingApp onBack={onBack} />
                    </ReportingProvider>
                </ReportingSettingsProvider>
            </ReportingThemeProvider>
        </ErrorBoundary>
    );
};
