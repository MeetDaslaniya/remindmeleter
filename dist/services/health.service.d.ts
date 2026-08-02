import { HealthStatus } from '../types';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AiService } from './ai.service';
import { ReminderService } from './reminder.service';
export declare class HealthService {
    private readonly schedulerService;
    private readonly aiService;
    private readonly reminderService;
    private readonly startedAt;
    constructor(schedulerService: SchedulerService, aiService: AiService, reminderService: ReminderService);
    getStatus(): Promise<HealthStatus>;
}
//# sourceMappingURL=health.service.d.ts.map