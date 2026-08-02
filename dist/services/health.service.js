"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
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
        const services = {
            scheduler: true,
            messaging: true,
            ai: this.aiService.isConfigured(),
        };
        const allOk = services.scheduler && services.messaging && services.ai;
        return {
            status: allOk ? 'healthy' : 'degraded',
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