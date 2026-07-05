const LABEL = "[extension]";

export const logger = {
  log(message: unknown, ...optionalParams: unknown[]): void {
    console.log(LABEL, message, ...optionalParams);
  },
  warn(message: unknown, ...optionalParams: unknown[]): void {
    console.warn(LABEL, message, ...optionalParams);
  },
  error(message: unknown, ...optionalParams: unknown[]): void {
    console.error(LABEL, message, ...optionalParams);
  },
};
