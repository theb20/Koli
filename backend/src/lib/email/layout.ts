/* ─────────────────────────────────────────────────────────────
   Layout de base pour tous les emails Skignas
   Compatible : Gmail, Outlook, Apple Mail, dark mode, mobile

   Le design (header, carte, footer) est piloté par des DESIGN
   TOKENS (voir ./tokens.ts), injectés dans les styles inline
   ci-dessous — pas dans le <style> du <head>, qui est ignoré par
   Gmail mobile et largement strippé par Outlook. Le <style> ne
   contient que ce qui NE PEUT être fait qu'en CSS : le reset, les
   :hover et les media queries (responsive + dark mode).

   Tokens éditables depuis le back-office → Templates email.
───────────────────────────────────────────────────────────── */
import { getContactInfo, waLink } from './settings'
import { getEmailTokens } from './tokens'

/** #rrggbb → "r,g,b" pour une utilisation dans rgba(...) */
function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

const STATIC_STYLE = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    a{text-decoration:none;color:inherit}
    img{display:block;border:0;outline:0}
    .preheader{display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;mso-hide:all}
    .footer-link:hover{opacity:.8}
    .cta:hover{opacity:.9}

    @media only screen and (max-width:600px){
      .wrapper{padding:16px 8px !important}
      .card-header{padding:20px 24px !important}
      .card-body{padding:28px 24px !important}
      .footer-bg{padding:18px 24px !important}
      .footer-row{display:block !important}
      .footer-item{display:block !important;margin:0 0 8px !important}
    }

    @media (prefers-color-scheme:dark){
      body,.bg-outer{background:#202124 !important}
      .card{background:#292a2d !important;border-color:#3c4043 !important}
      .card-body{background:#292a2d !important}
      .card-body *{color:#e8eaed}
      .support-block{background:#303134 !important;border-color:#3c4043 !important}
      .footer-bg{background:#202124 !important;border-color:#3c4043 !important}
      .footer-text,.footer-item{color:#9aa0a6 !important}
    }
`

export async function baseLayout(content: string, preheader = ''): Promise<string> {
  const year     = new Date().getFullYear()
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'
  const contact  = await getContactInfo()
  const t        = await getEmailTokens()
  const shadowRgb = hexToRgbTriplet(t.primaryColor)

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Skignas</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>${STATIC_STYLE}</style>
</head>
<body style="margin:0;padding:0;background:${t.bodyBg}">
  ${preheader ? `<div class="preheader">${preheader}</div>` : ''}

  <table class="bg-outer" width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${t.bodyBg};border-collapse:collapse">
    <tr>
      <td class="wrapper" align="center" style="padding:44px 24px">

        <!-- ══ CARD ══ -->
        <table class="card" width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;background:${t.cardBg};border-radius:${t.cardRadius}px;border:1px solid #dde3f5;overflow:hidden;border-collapse:collapse;box-shadow:0 8px 32px rgba(${shadowRgb},.12)">

          <!-- Header -->
          <tr>
            <td class="card-header"
              style="background:linear-gradient(135deg,${t.headerGradientFrom} 0%,${t.headerGradientTo} 100%);padding:28px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="border-collapse:collapse">
                <tr>
                  <td style="vertical-align:middle">
                    <a href="${frontUrl}" style="text-decoration:none;display:block;line-height:0">
                      <img src="${t.logoUrl}"
                           alt="Skignas"
                           width="150" height="40"
                           style="display:block;border:0;outline:0;width:150px;height:40px" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:.8px;text-transform:uppercase;background:rgba(255,255,255,.14);padding:6px 12px;border-radius:100px">
                      ${t.badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td class="card-body" style="padding:44px 40px 36px">
              ${content}
            </td>
          </tr>

          <!-- Bloc support -->
          <tr>
            <td style="padding:0 40px 32px">
              <table class="support-block" width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="background:#f8faff;border:1px solid #e5edff;border-radius:16px;border-collapse:separate">
                <tr>
                  <td style="padding:16px 20px">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
                      <tr>
                        <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#4b5563;vertical-align:middle">
                          Besoin d'aide ? Notre équipe répond 7j/7.
                        </td>
                        <td align="right" style="white-space:nowrap;vertical-align:middle">
                          <a href="${waLink(contact.whatsappNumber)}"
                            style="display:inline-block;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:700;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;padding:8px 14px;border-radius:100px">
                            💬 WhatsApp
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer carte -->
          <tr>
            <td class="footer-bg"
              style="background:#f8faff;border-top:1px solid #dbe4ff;padding:20px 40px">
              <table class="footer-row" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
                <tr>
                  <td class="footer-item" style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#8898c8">
                    © ${year} Skignas · Côte d'Ivoire
                  </td>
                  <td class="footer-item" align="right" style="font-family:system-ui,-apple-system,sans-serif;font-size:11px">
                    <a class="footer-link" href="mailto:${contact.supportEmail}" style="color:#6b7fb8;margin-right:14px">${contact.supportEmail}</a>
                    <a class="footer-link" href="${frontUrl}/privacy" style="color:#8898c8">Confidentialité</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- FIN CARD -->

        <p style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#a0aec0;text-align:center;margin:16px 0 0">
          ${t.footerText}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`
}
