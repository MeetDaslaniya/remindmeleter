import { HealthStatus } from '../types';

import { SchedulerService } from '../scheduler/scheduler.service';

import { AiService } from './ai.service';

import { ReminderService } from './reminder.service';

import { isMongoConnected } from '../db/connection';



export class HealthService {

  private readonly startedAt = Date.now();



  constructor(

    private readonly schedulerService: SchedulerService,

    private readonly aiService: AiService,

    private readonly reminderService: ReminderService

  ) {}



  async getStatus(): Promise<HealthStatus> {

    const stats = await this.reminderService.getStats();

    const mem = process.memoryUsage();

    const mongodb = isMongoConnected();



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


