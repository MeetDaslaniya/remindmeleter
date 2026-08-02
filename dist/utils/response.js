"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, message, statusCode = 200) {
    const body = {
        success: true,
        data,
        ...(message ? { message } : {}),
    };
    return res.status(statusCode).json(body);
}
function sendError(res, message, statusCode = 500, code, details) {
    const body = {
        success: false,
        error: {
            message,
            ...(code ? { code } : {}),
            ...(details !== undefined ? { details } : {}),
        },
    };
    return res.status(statusCode).json(body);
}
//# sourceMappingURL=response.js.map