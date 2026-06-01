// src/utils/errors.js
'use strict';

/**
 * Base API error. All thrown errors in the app should extend this.
 * The global error handler in app.js reads `statusCode` and `message`.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name       = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError    extends AppError { constructor(msg) { super(msg, 400); } }
class UnauthorizedError  extends AppError { constructor(msg) { super(msg, 401); } }
class ForbiddenError     extends AppError { constructor(msg) { super(msg, 403); } }
class NotFoundError      extends AppError { constructor(msg) { super(msg, 404); } }
class ConflictError      extends AppError { constructor(msg) { super(msg, 409); } }
class InternalError      extends AppError { constructor(msg) { super(msg, 500); } }

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError,
};
