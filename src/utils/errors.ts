export const EXIT_CODES = {
  SUCCESS: 0,
  BLOCKING_ISSUES: 1,
  INVALID_ARGS_OR_ERROR: 2,
} as const;

export class LaunchKitError extends Error {
  public readonly exitCode: number;
  public readonly code: string;

  constructor(
    message: string,
    exitCode: number = EXIT_CODES.INVALID_ARGS_OR_ERROR,
    code: string = "ERR_LAUNCHKIT",
  ) {
    super(message);
    this.name = "LaunchKitError";
    this.exitCode = exitCode;
    this.code = code;
    Object.setPrototypeOf(this, LaunchKitError.prototype);
  }
}
