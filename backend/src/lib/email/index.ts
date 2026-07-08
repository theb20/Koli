/* ─────────────────────────────────────────────────────────────
   Email module — barrel export
   Usage:
     import { sendWelcomeEmail, sendMagicLinkEmail } from '../lib/email'
───────────────────────────────────────────────────────────── */

export { send, resend, FROM }             from './client'
export { baseLayout }                     from './layout'
export * from './components'
export * from './types'

export { sendWelcomeEmail }               from './templates/welcome'
export { sendMagicLinkEmail }             from './templates/magic-link'
export { sendOrderConfirmationEmail }     from './templates/order-confirmation'
export { sendOrderStatusEmail }           from './templates/order-status'
export { sendContactReply }               from './templates/contact-reply'
export { sendBroadcastEmail }              from './templates/broadcast'
export { sendFlashDealEmail }              from './templates/flash-deal'
export type { FlashDealProduct }           from './templates/flash-deal'
export { sendNewOrderAdminEmail }          from './templates/new-order-admin'
export type { NewOrderAdminPayload }       from './templates/new-order-admin'
export { sendNewProductRequestAdminEmail } from './templates/new-product-request-admin'
export type { NewProductRequestAdminPayload } from './templates/new-product-request-admin'
export { sendProductRequestReplyEmail }    from './templates/product-request-reply'
