import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#090d16] text-white p-6 select-none">
          <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-100">Something went wrong</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nova Browser encountered an unexpected error in the user interface.
            </p>
            {this.state.error && (
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-[11px] font-mono text-red-400/90 text-left overflow-auto max-h-32 select-text">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  if (this.state.error) {
                    navigator.clipboard.writeText(this.state.error.toString());
                  }
                }}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex-1"
              >
                Copy Error
              </button>
              <button
                onClick={this.handleReload}
                className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 flex-1"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
