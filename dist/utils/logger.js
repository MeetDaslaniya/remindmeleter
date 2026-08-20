"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerLogger = exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
});
function canUseFileLogs() {
    const logsDir = path_1.default.join(process.cwd(), 'logs');
    try {
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        fs_1.default.accessSync(logsDir, fs_1.default.constants.W_OK);
        return true;
    }
    catch {
        return false;
    }
}
const transports = [
    new winston_1.default.transports.Console({
        format: combine(colorize(), logFormat),
    }),
];
if (canUseFileLogs()) {
    transports.push(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }), new winston_1.default.transports.File({
        filename: 'logs/combined.log',
    }));
}
exports.logger = winston_1.default.createLogger({
    level: config_1.config.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    transports,
});
exports.schedulerLogger = exports.logger.child({ service: 'scheduler' });
//# sourceMappingURL=logger.js.map