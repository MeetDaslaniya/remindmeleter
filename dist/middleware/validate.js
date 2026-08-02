"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const errors_1 = require("../utils/errors");
function validateRequest(schema, target = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            next(new errors_1.ValidationError('Request validation failed', result.error.flatten()));
            return;
        }
        req[target] = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map