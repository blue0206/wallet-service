export interface ApiResponse<PayloadType> {
  success: boolean;
  statusCode: number;
  payload: PayloadType;
}

export class ApiError extends Error {
  statusCode: number;
  details: unknown;
  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
