import {Component, ErrorInfo, ReactNode, StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type ErrorBoundaryProps = {children: ReactNode};
type ErrorBoundaryState = {error: Error | null};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-[#fafafa] font-sans p-6">
          <div className="bg-[#18181b] p-8 rounded-xl shadow-xl border border-red-500/30 max-w-md w-full">
            <h1 className="text-lg font-semibold text-red-400 mb-2">應用程式發生錯誤</h1>
            <p className="text-sm text-zinc-400 mb-4">請重新整理頁面。若問題持續，請回報下列訊息：</p>
            <pre className="text-xs font-mono text-zinc-500 bg-[#09090b] border border-[#27272a] p-3 rounded overflow-auto max-h-60">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
