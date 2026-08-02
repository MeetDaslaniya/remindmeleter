"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app_1 = require("./app");
const config_1 = require("./config");
const container_1 = require("./config/container");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    const logsDir = path_1.default.join(process.cwd(), 'logs');
    if (!fs_1.default.existsSync(logsDir)) {
        fs_1.default.mkdirSync(logsDir, { recursive: true });
    }
    const app = (0, app_1.createApp)();
    await container_1.container.schedulerService.restoreScheduledJobs();
    app.listen(config_1.config.PORT, () => {
        logger_1.logger.info(`Server listening on port ${config_1.config.PORT}`, {
            env: config_1.config.NODE_ENV,
            baseUrl: config_1.config.BASE_URL,
        });
        logger_1.logger.info(`Health check: ${config_1.config.BASE_URL}/health`);
        logger_1.logger.info(`Telegram webhook: ${config_1.config.BASE_URL}/telegram/webhook`);
    });
}
bootstrap().catch((error) => {
    logger_1.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
});
//# sourceMappingURL=server.js.map