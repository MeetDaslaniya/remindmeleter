"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_REMINDER_STATUSES = exports.ReminderStatus = void 0;
var ReminderStatus;
(function (ReminderStatus) {
    ReminderStatus["SCHEDULED"] = "scheduled";
    ReminderStatus["SENT"] = "sent";
    ReminderStatus["SNOOZED"] = "snoozed";
    ReminderStatus["COMPLETED"] = "completed";
    ReminderStatus["CANCELLED"] = "cancelled";
    ReminderStatus["FAILED"] = "failed";
})(ReminderStatus || (exports.ReminderStatus = ReminderStatus = {}));
/** Upcoming or waiting-for-user reminders (shown in /list, restored by the scheduler). */
exports.ACTIVE_REMINDER_STATUSES = [
    ReminderStatus.SCHEDULED,
    ReminderStatus.SENT,
    ReminderStatus.SNOOZED,
];
//# sourceMappingURL=index.js.map