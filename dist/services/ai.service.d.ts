import { ParsedReminder } from '../types';
export declare class AiService {
    private readonly client;
    private readonly model;
    private readonly defaultTimezone;
    constructor(apiUrl?: string, apiKey?: string, model?: string, defaultTimezone?: string);
    parseReminder(message: string, referenceDate?: Date): Promise<ParsedReminder | null>;
    private buildSystemPrompt;
    private parseAiContent;
    isConfigured(): boolean;
}
//# sourceMappingURL=ai.service.d.ts.map