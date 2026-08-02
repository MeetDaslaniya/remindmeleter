"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappProvider = void 0;
const errors_1 = require("../../utils/errors");
/**
 * Stub WhatsApp provider.
 * Implement sendMessage / parseIncomingPayload against the WhatsApp Business Cloud API,
 * then register this class in `config/container.ts` beside TelegramProvider.
 */
class WhatsappProvider {
    channel = 'whatsapp';
    async sendMessage(_message) {
        throw new errors_1.AppError('WhatsApp provider is not configured yet', 501, 'WHATSAPP_NOT_IMPLEMENTED');
    }
    parseIncomingPayload(_payload) {
        return null;
    }
}
exports.WhatsappProvider = WhatsappProvider;
//# sourceMappingURL=whatsapp.provider.js.map