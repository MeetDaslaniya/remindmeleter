"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const config_1 = require("./config");
const container_1 = require("./config/container");
const connection_1 = require("./db/connection");
const seed_admin_1 = require("./db/seed-admin");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    await (0, connection_1.connectMongo)();
    await (0, seed_admin_1.seedAdminIfNeeded)();
    const app = (0, app_1.createApp)();
    const server = http_1.default.createServer(app);
    const restored = await container_1.container.schedulerService.restoreScheduledJobs();
    logger_1.logger.info('Scheduler restored jobs from MongoDB', { count: restored });
    void container_1.container.telegramProvider
        .ensureCallbackUpdates(config_1.config.TELEGRAM_WEBHOOK_SECRET)
        .catch((error) => {
        logger_1.logger.warn('Telegram callback_query webhook check failed', {
            error: error instanceof Error ? error.message : String(error),
        });
    });
    container_1.container.adminReportService.start();
    const port = config_1.config.PORT;
    server.listen(port, '0.0.0.0', () => {
        logger_1.logger.info(`Server running on port ${port}`, {
            env: config_1.config.NODE_ENV,
            baseUrl: config_1.config.BASE_URL,
            db: config_1.config.MONGODB_DB_NAME,
        });
        logger_1.logger.info(`Health check: ${config_1.config.BASE_URL}/health`);
        logger_1.logger.info(`Telegram webhook: ${config_1.config.BASE_URL}/telegram/webhook`);
    });
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        logger_1.logger.info(`${signal} received`);
        server.close(async () => {
            try {
                container_1.container.adminReportService.stop();
                await (0, connection_1.disconnectMongo)();
            }
            catch (error) {
                logger_1.logger.error('Error during MongoDB disconnect', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            finally {
                process.exit(0);
            }
        });
        // Force exit if connections hang
        setTimeout(() => {
            logger_1.logger.warn('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000).unref();
    };
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
}
bootstrap().catch((error) => {
    logger_1.logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
});
//# sourceMappingURL=server.js.map