import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error("LearnNexus UI error", error, info);
    }
  }

  handleReset = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-md space-y-4 text-center">
          <AlertTriangle className="mx-auto h-9 w-9 text-red-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-ink">
              Something needs a quick refresh
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Your account session is preserved. Reload this view and continue
              studying from where you left off.
            </p>
          </div>
          <button className="btn-primary mx-auto" onClick={this.handleReset} type="button">
            <RotateCcw className="h-4 w-4" />
            Reload View
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
