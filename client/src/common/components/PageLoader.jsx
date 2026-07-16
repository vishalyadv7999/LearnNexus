const PageLoader = ({ message = "Loading..." }) => (
  <div className="flex min-h-screen items-center justify-center px-6">
    <div className="panel max-w-md text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <p className="text-sm font-medium text-muted">{message}</p>
    </div>
  </div>
);

export default PageLoader;

