/* ─────────────────────────────────────────────────────────────
   Layout de base pour tous les emails Skignas
   Compatible : Gmail, Outlook, Apple Mail, dark mode, mobile
───────────────────────────────────────────────────────────── */

export function baseLayout(content: string, preheader = ''): string {
  const year     = new Date().getFullYear()
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.ahobaut.fr'

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
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{margin:0;padding:0;background:#f0f4ff;-webkit-font-smoothing:antialiased}
    a{text-decoration:one;color:inherit}
    img{display:block;border:0;outline:0}
    .preheader{display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;mso-hide:all}

    /* ── Responsive ── */
    @media only screen and (max-width:600px){
      .wrapper{padding:16px !important}
      .card{border-radius:16px !important}
      .card-body{padding:28px 24px !important}
    }

    /* ── Dark mode ── */
    @media (prefers-color-scheme:dark){
      body,.bg-outer{background:#0d1117 !important}
      .card{background:#161b22 !important;border-color:#30363d !important}
      .card-header{background:linear-gradient(135deg,#0318cc 0%,#021399 100%) !important}
      .card-body *{color:#c9d1d9}
      .footer-bg{background:#0d1117 !important;border-color:#21262d !important}
      .footer-text{color:#484f58 !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0f4ff">
  ${preheader ? `<div class="preheader">${preheader}</div>` : ''}

  <table class="bg-outer" width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:#f0f4ff;border-collapse:collapse">
    <tr>
      <td class="wrapper" align="center" style="padding:40px 24px">

        <!-- ══ CARD ══ -->
        <table class="card" width="100%" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid #dbe4ff;overflow:hidden;border-collapse:collapse;box-shadow:0 4px 24px rgba(4,33,255,.07)">

          <!-- Header bleu -->
          <tr>
            <td class="card-header"
              style="background:linear-gradient(135deg,#0421ff 0%,#0318cc 100%);padding:26px 40px">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="border-collapse:collapse">
                <tr>
                  <td style="vertical-align:middle">
                    <a href="${frontUrl}" style="text-decoration:none;display:block;line-height:0">
                      <img src="https://skignas.ahobaut.fr/imgs_dropship/skignas_white.png"
                           alt="Skignas"
                           width="160" height="42"
                           style="display:block;border:0;outline:0;width:160px;height:42px" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align:middle">
                    <span style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.8px;text-transform:uppercase">
                      skignas.ahobaut.fr
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td class="card-body" style="padding:40px 40px 36px">
              ${content}
            </td>
          </tr>

          <!-- Footer carte -->
          <tr>
            <td class="footer-bg"
              style="background:#f8faff;border-top:1px solid #dbe4ff;padding:18px 40px">
              <p class="footer-text"
                style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#8898c8;line-height:1.8;text-align:center;margin:0">
                © ${year} Skignas · Côte d'Ivoire
                &nbsp;·&nbsp;
                <a href="${frontUrl}"
                  style="color:#0421ff;text-decoration:underline;text-underline-offset:2px">skignas.ahobaut.fr</a>
                &nbsp;·&nbsp;
                <a href="https://wa.me/237600000000"
                  style="color:#0421ff;text-decoration:underline;text-underline-offset:2px">WhatsApp SAV</a>
                &nbsp;·&nbsp;
                <a href="${frontUrl}/privacy"
                  style="color:#8898c8;text-decoration:underline;text-underline-offset:2px">Confidentialité</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- FIN CARD -->

        <p style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;color:#a0aec0;text-align:center;margin:14px 0 0">
          Vous recevez cet email car vous avez un compte Skignas.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`
}
