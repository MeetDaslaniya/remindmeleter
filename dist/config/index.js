"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3000),
    BASE_URL: zod_1.z.string().url().default('http://localhost:3000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    AI_API_URL: zod_1.z.string().url(),
    AI_API_KEY: zod_1.z.string().min(1),
    AI_MODEL: zod_1.z.string().min(1),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: zod_1.z.string().min(1),
    DEFAULT_TIMEZONE: zod_1.z.string().default('Asia/Kolkata'),
    /** Telegram chat/user id for daily health + EOD reports (optional) */
    ADMIN_TELEGRAM_CHAT_ID: zod_1.z.string().optional(),
    MONGODB_URI: zod_1.z.string().min(1),
    MONGODB_DB_NAME: zod_1.z.string().min(1).default('RemindMeAI'),
    JWT_SECRET: zod_1.z.string().min(16).default('remindai-dev-jwt-secret-change-me'),
    ADMIN_EMAIL: zod_1.z.string().email().default('admin@gmail.com'),
    ADMIN_PASSWORD: zod_1.z.string().min(6).default('Admin@123'),
});
function loadConfig() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const formatted = parsed.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${formatted}`);
    }
    return parsed.data;
}
exports.config = loadConfig();
//# sourceMappingURL=index.js.map