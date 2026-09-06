/**
 * Application-level error carrying a machine-readable code and an HTTP status.
 * The central error handler serialises these as `{ error: { code, message } }`.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const Errors = {
  validation: (message = 'Dados inválidos') =>
    new AppError('VALIDATION_ERROR', message, 400),
  unauthorized: (message = 'Não autenticado') =>
    new AppError('UNAUTHORIZED', message, 401),
  forbidden: (message = 'Acesso negado') =>
    new AppError('FORBIDDEN', message, 403),
  notFound: (message = 'Recurso não encontrado') =>
    new AppError('NOT_FOUND', message, 404),
  conflict: (message = 'Conflito') => new AppError('CONFLICT', message, 409),
  tooManyRequests: (message = 'Muitas requisições') =>
    new AppError('RATE_LIMITED', message, 429),
};
