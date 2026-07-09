"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendProductRequestReplyEmail = exports.sendNewProductRequestAdminEmail = exports.sendNewOrderAdminEmail = exports.sendBroadcastEmail = exports.sendContactReply = exports.sendOrderStatusEmail = exports.sendOrderConfirmationEmail = exports.sendMagicLinkEmail = exports.sendWelcomeEmail = void 0;
/* ─────────────────────────────────────────────────────────────
   Compatibility shim — all exports come from ./email/
   Do not add logic here; edit the files in ./email/ instead.
───────────────────────────────────────────────────────────── */
var email_1 = require("./email");
Object.defineProperty(exports, "sendWelcomeEmail", { enumerable: true, get: function () { return email_1.sendWelcomeEmail; } });
Object.defineProperty(exports, "sendMagicLinkEmail", { enumerable: true, get: function () { return email_1.sendMagicLinkEmail; } });
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return email_1.sendOrderConfirmationEmail; } });
Object.defineProperty(exports, "sendOrderStatusEmail", { enumerable: true, get: function () { return email_1.sendOrderStatusEmail; } });
Object.defineProperty(exports, "sendContactReply", { enumerable: true, get: function () { return email_1.sendContactReply; } });
Object.defineProperty(exports, "sendBroadcastEmail", { enumerable: true, get: function () { return email_1.sendBroadcastEmail; } });
Object.defineProperty(exports, "sendNewOrderAdminEmail", { enumerable: true, get: function () { return email_1.sendNewOrderAdminEmail; } });
Object.defineProperty(exports, "sendNewProductRequestAdminEmail", { enumerable: true, get: function () { return email_1.sendNewProductRequestAdminEmail; } });
Object.defineProperty(exports, "sendProductRequestReplyEmail", { enumerable: true, get: function () { return email_1.sendProductRequestReplyEmail; } });
//# sourceMappingURL=mailer.js.map