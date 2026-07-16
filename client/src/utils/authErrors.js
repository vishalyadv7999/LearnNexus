export const getAuthErrorMessage = (error, fallback = "Something went wrong.") => {
  if (error?.code === "ERR_NETWORK") {
    return "We couldn't reach the server. Please check your connection and try again.";
  }

  const details = error?.response?.data?.details;

  if (Array.isArray(details) && details.length > 0) {
    return details[0];
  }

  const message = error?.response?.data?.message;

  if (!message) {
    return fallback;
  }

  if (/invalid input/i.test(message) || /invalid data/i.test(message)) {
    return "Please check the form and try again.";
  }

  return message;
};
