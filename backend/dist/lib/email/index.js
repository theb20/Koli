"use strict";
/* ─────────────────────────────────────────────────────────────
   Email module — barrel export
   Usage:
     import { sendWelcomeEmail, sendMagicLinkEmail } from '../lib/email'
───────────────────────────────────────────────────────────── */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendProductRequestReplyEmail = exports.sendNewProductRequestAdminEmail = exports.sendNewOrderAdminEmail = exports.sendFlashDealEmail = exports.sendBroadcastEmail = exports.sendContactReply = exports.sendOrderStatusEmail = exports.sendOrderConfirmationEmail = exports.sendMagicLinkEmail = exports.sendWelcomeEmail = exports.baseLayout = exports.FROM = exports.resend = exports.send = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "send", { enumerable: true, get: function () { return client_1.send; } });
Object.defineProperty(exports, "resend", { enumerable: true, get: function () { return client_1.resend; } });
Object.defineProperty(exports, "FROM", { enumerable: true, get: function () { return client_1.FROM; } });
var layout_1 = require("./layout");
Object.defineProperty(exports, "baseLayout", { enumerable: true, get: function () { return layout_1.baseLayout; } });
__exportStar(require("./components"), exports);
__exportStar(require("./types"), exports);
var welcome_1 = require("./templates/welcome");
Object.defineProperty(exports, "sendWelcomeEmail", { enumerable: true, get: function () { return welcome_1.sendWelcomeEmail; } });
var magic_link_1 = require("./templates/magic-link");
Object.defineProperty(exports, "sendMagicLinkEmail", { enumerable: true, get: function () { return magic_link_1.sendMagicLinkEmail; } });
var order_confirmation_1 = require("./templates/order-confirmation");
Object.defineProperty(exports, "sendOrderConfirmationEmail", { enumerable: true, get: function () { return order_confirmation_1.sendOrderConfirmationEmail; } });
var order_status_1 = require("./templates/order-status");
Object.defineProperty(exports, "sendOrderStatusEmail", { enumerable: true, get: function () { return order_status_1.sendOrderStatusEmail; } });
var contact_reply_1 = require("./templates/contact-reply");
Object.defineProperty(exports, "sendContactReply", { enumerable: true, get: function () { return contact_reply_1.sendContactReply; } });
var broadcast_1 = require("./templates/broadcast");
Object.defineProperty(exports, "sendBroadcastEmail", { enumerable: true, get: function () { return broadcast_1.sendBroadcastEmail; } });
var flash_deal_1 = require("./templates/flash-deal");
Object.defineProperty(exports, "sendFlashDealEmail", { enumerable: true, get: function () { return flash_deal_1.sendFlashDealEmail; } });
var new_order_admin_1 = require("./templates/new-order-admin");
Object.defineProperty(exports, "sendNewOrderAdminEmail", { enumerable: true, get: function () { return new_order_admin_1.sendNewOrderAdminEmail; } });
var new_product_request_admin_1 = require("./templates/new-product-request-admin");
Object.defineProperty(exports, "sendNewProductRequestAdminEmail", { enumerable: true, get: function () { return new_product_request_admin_1.sendNewProductRequestAdminEmail; } });
var product_request_reply_1 = require("./templates/product-request-reply");
Object.defineProperty(exports, "sendProductRequestReplyEmail", { enumerable: true, get: function () { return product_request_reply_1.sendProductRequestReplyEmail; } });
//# sourceMappingURL=index.js.map