export const toInputDate = (value = new Date()) =>
  new Date(value).toISOString().slice(0, 10);

export const formatStudyDate = (value) => {
  const textValue = String(value || "");
  const dateOnlyMatch = textValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const formatPercent = (value) => `${value}%`;

export const formatMinutes = (value) => `${value} min`;

export const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
};
