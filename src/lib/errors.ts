export const getErrorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = 'message' in error ? error.message : undefined;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeDetails = 'details' in error ? error.details : undefined;
    if (typeof maybeDetails === 'string' && maybeDetails.trim()) {
      return maybeDetails;
    }
  }

  if (typeof error === 'string' && error.trim()) return error;

  return fallback;
};

