export const debugLog = (...args: any[]): void => {
  if (__DEV__) {
    // Using console.debug ensures logs only show in debug builds
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
};
