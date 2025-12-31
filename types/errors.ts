export class DiagnosticRequiredError extends Error {
  constructor(message: string = 'Diagnostic exam must be completed before accessing this feature') {
    super(message);
    this.name = 'DiagnosticRequiredError';
  }
}

export class MLBackendError extends Error {
  statusCode: number;
  originalError?: any;

  constructor(message: string, statusCode: number, originalError?: any) {
    super(message);
    this.name = 'MLBackendError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export function isDiagnosticRequiredError(error: any): error is DiagnosticRequiredError {
  return error instanceof DiagnosticRequiredError ||
         error?.name === 'DiagnosticRequiredError' ||
         (error?.message && typeof error.message === 'string' &&
          error.message.toLowerCase().includes('diagnostic exam must be completed'));
}
