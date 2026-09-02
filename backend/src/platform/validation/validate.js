/**
 * Request validation.
 *
 * Architecture principle 3 / ADR-06: the database is not the validator. Every write is
 * validated by an explicit zod schema at the edge.
 *
 * `zod` has been a declared dependency of both apps from the start and was imported
 * NOWHERE in the backend — controllers read `req.body` straight into Mongoose. That is
 * how the fee-concession bug shipped: Mongoose strict mode silently discarded the unknown
 * `concession` field and the arithmetic produced NaN.
 */
const { z } = require('zod');
const mongoose = require('mongoose');
const { ValidationError } = require('../../shared/errors');

/** Turn a ZodError into the standard `details` array. */
function toDetails(error) {
  return error.issues.map((i) => ({
    field: i.path.join('.') || '(root)',
    code: i.code,
    message: i.message,
  }));
}

/**
 * validate({ body, query, params })
 * Parsed output REPLACES the raw input, so a controller can only ever see validated,
 * stripped data — unknown keys never reach a model.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const key of ['body', 'query', 'params']) {
        const schema = schemas[key];
        if (!schema) continue;
        const result = schema.safeParse(req[key]);
        if (!result.success) {
          throw new ValidationError(`Invalid request ${key}`, toDetails(result.error));
        }
        // Express 5 makes req.query a getter; assign defensively.
        try {
          req[key] = result.data;
        } catch {
          Object.defineProperty(req, key, { value: result.data, writable: true });
        }
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

// ── Shared primitives ────────────────────────────────────────────────────────

const objectId = () =>
  z
    .string()
    .refine((v) => mongoose.Types.ObjectId.isValid(v), { message: 'Must be a valid id' });

/** Accepts an id or a populated document; normalises to the id string. */
const objectIdLike = () =>
  z.union([objectId(), z.object({ _id: objectId() }).transform((o) => o._id)]);

const pagination = () =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    sort: z.string().optional(),
  });

/** Integer paise — the only representation money is stored in (ADR-07). */
const paise = () =>
  z.coerce
    .number()
    .int({ message: 'Amount must be in whole paise (no fractions)' })
    .nonnegative();

const isoDate = () => z.coerce.date();

const indianPhone = () =>
  z
    .string()
    .regex(/^(\+91[-\s]?)?[6-9]\d{9}$/, 'Must be a valid Indian mobile number');

const pinCode = () => z.string().regex(/^[1-9]\d{5}$/, 'Must be a valid 6-digit PIN code');

/** Aadhaar is accepted for verification but NEVER stored raw (architecture §15.3). */
const aadhaar = () => z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits');

const email = () => z.string().email().toLowerCase().trim();

const nonEmptyString = (max = 200) => z.string().trim().min(1).max(max);

/**
 * Section / division names are always normalised to uppercase — matching the invariant
 * `academic.service.js#normalizeDivisionName` already enforces at the model layer.
 */
const divisionName = () => z.string().trim().toUpperCase().min(1).max(10);

/** Params shape for the ubiquitous `/:id` route. */
const idParam = () => z.object({ id: objectId() });

module.exports = {
  z,
  validate,
  toDetails,
  schemas: {
    objectId,
    objectIdLike,
    pagination,
    paise,
    isoDate,
    indianPhone,
    pinCode,
    aadhaar,
    email,
    nonEmptyString,
    divisionName,
    idParam,
  },
};
