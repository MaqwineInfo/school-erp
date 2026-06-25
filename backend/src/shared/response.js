function sendSuccess(res, data, message = null, statusCode = 200, meta = null) {
  const body = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendCreated(res, data, message = 'Created') {
  return sendSuccess(res, data, message, 201);
}

function sendError(res, statusCode, code, message, details = []) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details },
  });
}

function buildPaginationMeta(total, page, limit) {
  return {
    total,
    page: +page,
    limit: +limit,
    totalPages: Math.ceil(total / +limit),
    hasNext: +page < Math.ceil(total / +limit),
    hasPrev: +page > 1,
  };
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(query.limit ?? '20', 10)));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { sendSuccess, sendCreated, sendError, buildPaginationMeta, parsePagination };
