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
  sendNewOrderMerchantEmail,
  sendNewProductRequestAdminEmail,
  sendProductRequestReplyEmail,
  sendReviewRequestEmail,
  sendReturnStatusEmail,
  sendNewReturnAdminEmail,
  sendVerificationCodeEmail,
  sendTwoFactorEnabledEmail,
  sendTwoFactorDisabledEmail,
  sendSecurityUpdateEmail,
  sendSecurityAlertEmail,
  sendLowStockAlertEmail,
  sendMonthlySettlementEmail,
  sendNewMerchantMessageEmail,
  sendNewAdminMessageEmail,
  sendSubscriptionInvoiceEmail,
  sendStoreSuspendedEmail,
  sendStoreReactivatedEmail,
} from './email'

export type { OrderItem, OrderConfirmationPayload, NewOrderAdminPayload, NewProductRequestAdminPayload, NewReturnAdminPayload } from './email'
