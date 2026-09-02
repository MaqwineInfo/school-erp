/**
 * Error hierarchy.
 *
 * Architecture §16 — the full code set from the platform specification. Every error a
 * controller or service throws must be one of these; the global errorHandler maps them
 * to the standard envelope.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class BadRequestError extends AppError {
  constructor(message) {
    super(message, 400, 'BAD_REQUEST');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 403 MODULE_DISABLED — the tenant's plan excludes this module.
 * Deliberately distinct from FORBIDDEN: the UI renders a different state (WF-0281),
 * and "your school hasn't bought this" is not "you aren't allowed".
 */
class ModuleDisabledError extends AppError {
  constructor(module) {
    super(`Module "${module}" is not enabled for this school`, 403, 'MODULE_DISABLED');
    this.details = [{ module }];
  }
}

/**
 * 422 BUSINESS_RULE — the request was well-formed and permitted, but a domain rule
 * refuses it (section full, marks exceed max, dues pending, concession over balance).
 */
class BusinessRuleError extends AppError {
  constructor(message, details = []) {
    super(message, 422, 'BUSINESS_RULE');
    this.details = Array.isArray(details) ? details : [details];
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

/**
 * 400 TENANT_REQUIRED — a platform administrator called a tenant-scoped endpoint without
 * choosing which school to act on.
 *
 * The super admin's own `tenantId` is null by design, so `new Scope(...)` used to throw a
 * plain Error and every such request surfaced as a 500. It is a missing input, not a
 * server fault: the client must send `X-Tenant-Id`.
 */
class TenantRequiredError extends AppError {
  constructor(module) {
    super(
      'Select a school first — this endpoint is tenant-scoped. Send the X-Tenant-Id header.',
      400,
      'TENANT_REQUIRED',
    );
    this.details = module ? [{ module }] : [];
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  ModuleDisabledError,
  BusinessRuleError,
  RateLimitError,
};
