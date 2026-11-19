import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { copyTextToClipboard } from '../utils/clipboard';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copyState: 'idle' | 'copied' | 'failed';
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copyState: 'idle',
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private unmounted = false;

  public componentDidMount() {
    // If the application loaded successfully, clear the chunk reload retry flag
    // after 5 seconds of stable execution, allowing future chunk reload retries
    // across the session without permanent white screens.
    this.cleanupTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem('chunk_reload_triggered');
      } catch (_) {}
    }, 5000);
  }

  public componentWillUnmount() {
    this.unmounted = true;
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, copyState: 'idle' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    // If chunk hash mismatch occurs after a rebuild, auto-reload once to refresh chunks
    if (
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed')
    ) {
      if (!sessionStorage.getItem('chunk_reload_triggered')) {
        sessionStorage.setItem('chunk_reload_triggered', 'true');
        window.location.reload();
        return;
      }
    }
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem('chunk_reload_triggered');
    } catch (_) {}
    window.location.reload();
  };

  // navigator.clipboard.writeText rejects outright in an insecure context, and
  // the old call ignored the promise: an unhandled rejection plus a button that
  // looked like it had done something. The helper resolves true only on a real
  // write, so the button can report what actually happened.
  private handleCopyError = async () => {
    if (!this.state.error) return;
    const copied = await copyTextToClipboard(this.state.error.toString());
    if (this.unmounted) return;
    this.setState({ copyState: copied ? 'copied' : 'failed' });
  };

  public render() {

    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#0e0f12] text-white p-6 select-none">
          <div className="max-w-md w-full bg-[#141518] border border-white/[0.08] rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-base font-semibold tracking-[-0.01em] text-neutral-100">Something went wrong</h1>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Nova Browser encountered an unexpected error in the user interface.
            </p>
            {this.state.error && (
              <div className="p-3 bg-black/50 border border-white/[0.07] rounded-lg text-[11px] font-mono text-red-400/90 text-left overflow-auto max-h-32 select-text">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleCopyError}
                className="py-2 px-3.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-neutral-200 rounded-lg text-xs font-medium transition-colors flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {this.state.copyState === 'copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {this.state.copyState === 'copied'
                    ? 'Copied!'
                    : this.state.copyState === 'failed'
                      ? 'Copy Failed'
                      : 'Copy Error'}
                </span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="py-2 px-3.5 bg-white hover:bg-neutral-200 text-neutral-950 rounded-lg text-xs font-medium transition-colors flex-1 cursor-pointer"
              >
                Reload App
              </button>
            </div>
            {this.state.copyState === 'failed' && (
              <p role="alert" className="text-[11px] text-red-400/90">
                The clipboard is not available here — select the error text above and copy it manually.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
