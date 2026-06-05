/**
 * ErrorBoundary — catches React errors and displays them clearly.
 * Helps with debugging component rendering issues.
 */
import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-red-50 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-red-900">Ada Kesalahan</h1>
            <p className="mt-2 text-sm text-red-700">
              {this.state.error?.message || "Terjadi kesalahan yang tidak terduga."}
            </p>
            <details className="mt-4 rounded bg-red-100 p-3 text-left">
              <summary className="cursor-pointer text-xs font-semibold text-red-800">
                Detail teknis
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.href = "/"}
              className="mt-4 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
