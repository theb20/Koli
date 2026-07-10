/* ─────────────────────────────────────────────────────────────
   Compatibility shim — all exports come from ./email/
   Do not add logic here; edit the files in ./email/ instead.
───────────────────────────────────────────────────────────── */
export {
  sendWelcomeEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendContactReply,
  sendBroadcastEmail,
  sendNewOrderAdminEmail,
  sendNewProductRequestAdminEmail,
  sendProductRequestReplyEmail,
  sendReturnStatusEmail,
  sendNewReturnAdminEmail,
} from './email'

export type { OrderItem, OrderConfirmationPayload, NewOrderAdminPayload, NewProductRequestAdminPayload, NewReturnAdminPayload } from './email'
