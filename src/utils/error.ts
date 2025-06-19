export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as any).message);
  }
  return typeof error === 'string' ? error : 'Unknown error';
};
