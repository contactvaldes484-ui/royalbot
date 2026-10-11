// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Global Error Handler — centralized error management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
AppError.badRequest = (msg = 'Requête invalide.') => new AppError(msg, 400, 'BAD_REQUEST');
AppError.unauthorized = (msg = 'Non autorisé.') => new AppError(msg, 401, 'UNAUTHORIZED');
AppError.forbidden = (msg = 'Accès refusé.') => new AppError(msg, 403, 'FORBIDDEN');
AppError.notFound = (msg = 'Ressource introuvable.') => new AppError(msg, 404, 'NOT_FOUND');
AppError.conflict = (msg = 'Conflit de données.') => new AppError(msg, 409, 'CONFLICT');
AppError.tooMany = (msg = 'Trop de requêtes.') => new AppError(msg, 429, 'TOO_MANY_REQUESTS');

// Async route wrapper — eliminates try/catch in every route
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler middleware (must be registered last)
function errorHandler(err, req, res, _next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur interne du serveur.';
  let code = err.code || 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.join(', ');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `La valeur de "${field}" existe déjà.`;
  }

  // Mongoose cast error (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Format invalide pour "${err.path}".`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Token invalide.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expiré. Veuillez vous reconnecter.';
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error(`[ERROR] ${statusCode} ${code}: ${message}`);
    console.error(err.stack);
  }

  // In production, don't leak internal error details
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && statusCode >= 500 && !err.isOperational) {
    message = 'Erreur interne du serveur.';
  }

  res.status(statusCode).json({
    error: message,
    code,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

// Handle unhandled promise rejections & uncaught exceptions
function setupProcessErrorHandlers() {
  process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    // Give time to finish pending requests, then exit
    setTimeout(() => process.exit(1), 1000);
  });
}

module.exports = { AppError, catchAsync, errorHandler, setupProcessErrorHandlers };
