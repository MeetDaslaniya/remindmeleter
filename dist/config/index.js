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
    PORT: zod_1.z.coerce.number().default(5000),
    BASE_URL: zod_1.z.string().url().default('http://localhost:5000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    AI_API_URL: zod_1.z.string().url(),
    AI_API_KEY: zod_1.z.string().min(1),
    AI_MODEL: zod_1.z.string().min(1),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: zod_1.z.string().min(1),
    DEFAULT_TIMEZONE: zod_1.z.string().default('Asia/Kolkata'),
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