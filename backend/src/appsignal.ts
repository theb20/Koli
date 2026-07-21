/**
 * Doit être importé en tout premier (avant app.ts et toute autre route),
 * même principe que instrument.ts (Sentry) — permet à l'instrumentation
 * automatique de s'appliquer aux modules chargés ensuite.
 *
 * active est dérivé de la présence de APPSIGNAL_PUSH_API_KEY plutôt que
 * codé en dur à true : tant que la clé est absente, rien n'est envoyé et
 * rien ne casse (même principe fail-open que Cloudmersive/PayDunya/Sentry
 * dans ce projet).
 */
import { Appsignal } from '@appsignal/nodejs'

new Appsignal({
  active: !!process.env.APPSIGNAL_PUSH_API_KEY,
  name: 'skignas',
})
