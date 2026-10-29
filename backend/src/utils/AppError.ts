export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(resource: string) {
    return new AppError(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} not found`);
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(400, code, message);
  }

  static unauthorized(message = "Not authenticated") {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Not allowed") {
    return new AppError(403, "FORBIDDEN", message);
  }

  static conflict(message: string, code = "CONFLICT") {
    return new AppError(409, code, message);
  }

  static serviceUnavailable(message: string, code = "SERVICE_UNAVAILABLE") {
    return new AppError(503, code, message);
  }
}
