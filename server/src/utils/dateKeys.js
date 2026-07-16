const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, "0");

const getLocalDateKey = (input = new Date()) => {
  if (typeof input === "string" && DATE_KEY_PATTERN.test(input)) {
    return input;
  }

  const date = input instanceof Date ? new Date(input) : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return getLocalDateKey(new Date());
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const dateFromLocalDateKey = (dateKey = getLocalDateKey()) => {
  if (!DATE_KEY_PATTERN.test(String(dateKey))) {
    return dateFromLocalDateKey(getLocalDateKey(dateKey));
  }

  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDaysToDateKey = (dateKey, amount) => {
  const date = dateFromLocalDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return getLocalDateKey(date);
};

const daysBetweenDateKeys = (laterDateKey, earlierDateKey) =>
  Math.round(
    (dateFromLocalDateKey(laterDateKey).getTime() -
      dateFromLocalDateKey(earlierDateKey).getTime()) /
      DAY_IN_MS
  );

module.exports = {
  DATE_KEY_PATTERN,
  addDaysToDateKey,
  dateFromLocalDateKey,
  daysBetweenDateKeys,
  getLocalDateKey,
};
