const EmptyState = ({ title, description }) => (
  <div className="panel text-center">
    <h3 className="text-xl font-bold text-ink">{title}</h3>
    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted">
      {description}
    </p>
  </div>
);

export default EmptyState;

