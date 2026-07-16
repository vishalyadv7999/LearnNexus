import { formatPercent } from "../../utils/format";

const ProgressBar = ({ value, current, total, label = "Progress" }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="text-sm text-muted">
        {current}/{total} completed
      </p>
    </div>
    <div className="h-3 overflow-hidden rounded-full bg-primary/10">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
    <p className="text-sm font-medium text-primary">{formatPercent(value)}</p>
  </div>
);

export default ProgressBar;
