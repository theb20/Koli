"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
exports.sendOrderStatusEmail = sendOrderStatusEmail;
exports.sendContactReply = sendContactReply;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const FROM = process.env.EMAIL_FROM ?? 'Koli <service.client@koli.cm>';
/* ─── Templates ──────────────────────────────────────────── */
function baseLayout(content) {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    .header  { background: #0421ff; padding: 28px 36px; }
    .header h1 { color: #fff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .body    { padding: 36px; }
    .footer  { padding: 20px 36px; background: #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px; }
    .btn     { display: inline-block; padding: 12px 28px; background: #0421ff; color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
    .tag { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>🛍 Koli</h1></div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} Koli · Douala, Cameroun<br/>
      <a href="https://koli.cm" style="color:#6b7280">koli.cm</a> ·
      <a href="https://wa.me/237600000000" style="color:#6b7280">WhatsApp SAV</a>
    </div>
  </div>
</body>
</html>`;
}
/** Email de bienvenue après inscription */
async function sendWelcomeEmail(to, prenom) {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Bienvenue chez Koli, ${prenom} ! 🎉`,
        html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px">Bonjour ${prenom} 👋</h2>
      <p>Votre compte Koli est créé avec succès. Bienvenue dans notre communauté de <strong>12 000+</strong> clients satisfaits.</p>
      <p>Vous bénéficiez dès maintenant de :</p>
      <ul style="color:#374151;line-height:2">
        <li>Suivi de vos commandes en temps réel</li>
        <li>Accès à vos favoris et adresses sauvegardées</li>
        <li>Offres exclusives membres</li>
      </ul>
      <hr class="divider"/>
      <a href="${process.env.FRONTEND_URL}/catalogue" class="btn">Découvrir le catalogue →</a>
    `),
    });
}
/** Email de confirmation de commande */
async function sendOrderConfirmationEmail(to, order) {
    const itemsHtml = order.items.map(i => `
    <tr>
      <td style="padding:8px 0;color:#374151">${i.name}</td>
      <td style="padding:8px 0;text-align:center;color:#6b7280">×${i.qty}</td>
      <td style="padding:8px 0;text-align:right;color:#374151;font-weight:600">${(i.price * i.qty / 100).toLocaleString('fr-FR')} FCFA</td>
    </tr>
  `).join('');
    const paymentLabels = {
        orange: 'Orange Money', mtn: 'MTN Mobile Money', wave: 'Wave', cash: 'Paiement à la livraison'
    };
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Commande confirmée — ${order.orderNumber} ✓`,
        html: baseLayout(`
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px">Merci ${order.prenom} ! 🎉</h2>
      <p>Votre commande <strong>${order.orderNumber}</strong> a bien été reçue.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:20px 0">
        <p style="margin:0;color:#15803d;font-size:13px;font-weight:600">✓ Commande en cours de traitement</p>
      </div>
      <hr class="divider"/>
      <table style="width:100%;border-collapse:collapse">
        ${itemsHtml}
        <tr><td colspan="3" style="border-top:1px solid #e5e7eb;padding-top:8px"></td></tr>
        <tr>
          <td colspan="2" style="padding:8px 0;font-weight:700;color:#111827">Total</td>
          <td style="padding:8px 0;text-align:right;font-weight:900;color:#0421ff;font-size:18px">${(order.total / 100).toLocaleString('fr-FR')} FCFA</td>
        </tr>
      </table>
      <hr class="divider"/>
      <p><strong>Paiement :</strong> ${paymentLabels[order.paymentMethod] ?? order.paymentMethod}</p>
      <p><strong>Livraison :</strong> ${order.deliveryMethod === 'express' ? 'Express (24h)' : 'Standard (48–72h)'}</p>
      <hr class="divider"/>
      <a href="${process.env.FRONTEND_URL}/commandes/${order.orderNumber}" class="btn">Suivre ma commande →</a>
    `),
    });
}
/** Email de changement de statut de commande */
async function sendOrderStatusEmail(to, prenom, orderNumber, status) {
    const statusMsg = {
        confirmed: { title: 'Commande confirmée', msg: 'Votre commande a été confirmée et est en cours de préparation.', emoji: '✅' },
        preparing: { title: 'En préparation', msg: 'Notre équipe prépare votre colis avec soin.', emoji: '📦' },
        shipped: { title: 'Expédiée !', msg: 'Votre colis est en route. Le livreur vous contactera pour la remise.', emoji: '🚚' },
        delivered: { title: 'Livrée !', msg: 'Votre commande a été livrée. Nous espérons qu\'elle vous satisfait.', emoji: '🎉' },
        cancelled: { title: 'Annulée', msg: 'Votre commande a été annulée. Un remboursement sera effectué sous 48h si applicable.', emoji: '❌' },
    };
    const info = statusMsg[status];
    if (!info)
        return;
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `${info.emoji} ${info.title} — ${orderNumber}`,
        html: baseLayout(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px">${info.emoji} ${info.title}</h2>
      <p>Bonjour ${prenom},</p>
      <p>${info.msg}</p>
      <p>Commande : <strong>${orderNumber}</strong></p>
      <hr class="divider"/>
      <a href="${process.env.FRONTEND_URL}/commandes/${orderNumber}" class="btn">Voir ma commande →</a>
    `),
    });
}
/** Email de réponse au formulaire de contact */
async function sendContactReply(to, prenom, sujet) {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `Re: ${sujet} — Koli`,
        html: baseLayout(`
      <p>Bonjour ${prenom},</p>
      <p>Nous avons bien reçu votre message concernant <strong>"${sujet}"</strong> et notre équipe y répondra dans les <strong>24 heures</strong> ouvrées.</p>
      <p>En attendant, vous pouvez nous joindre directement sur WhatsApp pour toute urgence :</p>
      <a href="https://wa.me/237600000000" class="btn">WhatsApp SAV →</a>
    `),
    });
}
//# sourceMappingURL=mailer.js.map