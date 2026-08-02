"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.looksLikeReminderIntent = looksLikeReminderIntent;
exports.isGreeting = isGreeting;
exports.isThanks = isThanks;
const GREETING_PATTERN = /^(hi|hello|hey|hola|namaste|yo|sup|good\s+(morning|afternoon|evening)|gm|howdy)[\s!.,?]*$/i;
const THANKS_PATTERN = /^(thanks|thank\s+you|thx|ty|ok|okay|got\s+it|cool|great)[\s!.,?]*$/i;
/**
 * True when the message is clearly a reminder request (AI or relative parser).
 */
function looksLikeReminderIntent(text) {
    const normalized = text.trim().toLowerCase();
    if (!normalized) {
        return false;
    }
    if (/\bremind\b/.test(normalized)) {
        return true;
    }
    if (/\bnag\s+me\b/.test(normalized)) {
        return true;
    }
    if (/\breminder\b/.test(normalized)) {
        return true;
    }
    if (/\bevery\b/.test(normalized)) {
        return true;
    }
    if (/\b\d+\s*(minutes?|mins?|hours?|hrs?)\s+before\b/.test(normalized)) {
        return true;
    }
    if (/\bbefore\s+\d+\s*(minutes?|mins?|hours?|hrs?)\b/.test(normalized)) {
        return true;
    }
    if (/\bin\s+\d+\s*(minute|min|mins|hour|hours|hr|hrs|day|days)\b/.test(normalized)) {
        return true;
    }
    if (/\b(today|tomorrow|tonight)\b/.test(normalized) && /\b(at|by)\b/.test(normalized)) {
        return true;
    }
    if (/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/.test(normalized)) {
        return true;
    }
    return false;
}
function isGreeting(text) {
    return GREETING_PATTERN.test(text.trim());
}
function isThanks(text) {
    return THANKS_PATTERN.test(text.trim());
}
//# sourceMappingURL=message-intent.js.map