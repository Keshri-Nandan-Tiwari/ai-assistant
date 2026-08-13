export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new AppError(code, message, 400);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(code, message, 401);
  }
  static forbidden(message = 'You do not have access to this resource', code = 'FORBIDDEN') {
    return new AppError(code, message, 403);
  }
  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new AppError(code, message, 404);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(code, message, 409);
  }
  static tooManyRequests(message = 'Too many requests, please try again later', code = 'RATE_LIMITED') {
    return new AppError(code, message, 429);
  }
  static internal(message = 'Something went wrong', code = 'INTERNAL_ERROR') {
    return new AppError(code, message, 500);
  }
}
