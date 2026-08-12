import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 text-white p-6 select-none">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h1 className="text-xl font-semibold text-slate-100">Something went wrong</h1>
            <p className="text-sm text-slate-400">
              Nova Browser encountered an unexpected error in the application interface.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-red-400 text-left overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors duration-150 shadow-md"
            >
              Reload Nova Browser
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
