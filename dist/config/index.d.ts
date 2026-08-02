import { z } from 'zod';
declare const envSchema: z.ZodObject<{
    PORT: z.ZodDefault<z.ZodNumber>;
    BASE_URL: z.ZodDefault<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    AI_API_URL: z.ZodString;
    AI_API_KEY: z.ZodString;
    AI_MODEL: z.ZodString;
    TELEGRAM_BOT_TOKEN: z.ZodString;
    TELEGRAM_WEBHOOK_SECRET: z.ZodString;
    DEFAULT_TIMEZONE: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    PORT: number;
    BASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    AI_API_URL: string;
    AI_API_KEY: string;
    AI_MODEL: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_WEBHOOK_SECRET: string;
    DEFAULT_TIMEZONE: string;
}, {
    AI_API_URL: string;
    AI_API_KEY: string;
    AI_MODEL: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_WEBHOOK_SECRET: string;
    PORT?: number | undefined;
    BASE_URL?: string | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    DEFAULT_TIMEZONE?: string | undefined;
}>;
export type EnvConfig = z.infer<typeof envSchema>;
export declare const config: {
    PORT: number;
    BASE_URL: string;
    NODE_ENV: "development" | "production" | "test";
    AI_API_URL: string;
    AI_API_KEY: string;
    AI_MODEL: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_WEBHOOK_SECRET: string;
    DEFAULT_TIMEZONE: string;
};
export {};
//# sourceMappingURL=index.d.ts.map