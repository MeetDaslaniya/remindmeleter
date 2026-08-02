"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const response_1 = require("../utils/response");
const logger_1 = require("../utils/logger");
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        logger_1.logger.warn('Operational error', {
            code: err.code,
            message: err.message,
            statusCode: err.statusCode,
        });
        return (0, response_1.sendError)(res, err.message, err.statusCode, err.code, err.details);
    }
    if (err instanceof zod_1.ZodError) {
        return (0, response_1.sendError)(res, 'Request validation failed', 400, 'VALIDATION_ERROR', err.flatten());
    }
    logger_1.logger.error('Unhandled error', { error: err.message, stack: err.stack });
    return (0, response_1.sendError)(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}
function notFoundHandler(req, res) {
    return (0, response_1.sendError)(res, `Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
}
//# sourceMappingURL=errorHandler.js.map