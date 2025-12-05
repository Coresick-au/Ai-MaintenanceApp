import React, { Component } from 'react';
import { Button } from './UIComponents';
import { Icons } from '../constants/icons';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and potentially to an error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Store error info for debugging
    this.setState({
      error,
      errorInfo
    });

    // You could also send this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-8 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <Icons.ExclamationTriangle className="h-8 w-8 text-red-600" />
              </div>
              
              <h1 className="text-xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              
              <p className="text-slate-300 mb-6">
                The application encountered an unexpected error. Your data is safe and has been automatically saved.
              </p>

              {/* Show error details in development */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-slate-400 hover:text-white mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-slate-900 rounded p-3 text-xs text-red-400 font-mono overflow-auto max-h-32">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={this.handleReset}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Icons.RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={() => window.location.reload()}
                  variant="secondary"
                >
                  <Icons.RotateCcw className="h-4 w-4 mr-2" />
                  Reload App
                </Button>
              </div>

              <p className="text-xs text-slate-500 mt-6">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = (Component, fallback) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;
