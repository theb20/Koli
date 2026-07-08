/* ─────────────────────────────────────────────────────────────
   Compatibility shim — all exports come from ./email/
   Do not add logic here; edit the files in ./email/ instead.
───────────────────────────────────────────────────────────── */
export {
  sendWelcomeEmail,
  sendMagicLinkEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendContactReply,
  sendBroadcastEmail,
  sendNewOrderAdminEmail,
  sendNewProductRequestAdminEmail,
  sendProductRequestReplyEmail,
} from './email'

export type { OrderItem, OrderConfirmationPayload, NewOrderAdminPayload, NewProductRequestAdminPayload } from './email'
