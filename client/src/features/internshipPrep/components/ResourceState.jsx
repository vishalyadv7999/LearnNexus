import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";

const ResourceState = ({ error, isLoading, onRetry }) => {
  if (isLoading) {
    return (
      <div className="panel flex min-h-48 items-center justify-center gap-3 text-sm font-bold text-muted">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        Loading preparation guide...
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-300" />
        <div>
          <h2 className="text-lg font-black text-ink">This guide did not load</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{error}</p>
        </div>
        <button className="btn-secondary" onClick={onRetry} type="button">
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return null;
};

export default ResourceState;
