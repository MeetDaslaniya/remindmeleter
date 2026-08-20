"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const connection_1 = require("../db/connection");
class HealthService {
    schedulerService;
    aiService;
    reminderService;
    startedAt = Date.now();
    constructor(schedulerService, aiService, reminderService) {
        this.schedulerService = schedulerService;
        this.aiService = aiService;
        this.reminderService = reminderService;
    }
    async getStatus() {
        const stats = await this.reminderService.getStats();
        const mem = process.memoryUsage();
        const mongodb = (0, connection_1.isMongoConnected)();
        const services = {
            scheduler: true,
            messaging: true,
            ai: this.aiService.isConfigured(),
            mongodb,
        };
        const allOk = services.scheduler && services.messaging && services.ai && services.mongodb;
        return {
            status: allOk ? 'healthy' : mongodb ? 'degraded' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startedAt) / 1000),
            memory: {
                used: Math.round(mem.heapUsed / 1024 / 1024),
                total: Math.round(mem.heapTotal / 1024 / 1024),
            },
            services,
            reminders: {
                scheduled: stats.scheduled,
                activeJobs: this.schedulerService.getActiveJobCount(),
            },
        };
    }
}
exports.HealthService = HealthService;
//# sourceMappingURL=health.service.js.map