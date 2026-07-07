"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactInfo = getContactInfo;
exports.waLink = waLink;
const prisma_1 = require("../prisma");
const DEFAULTS = {
    whatsappNumber: '2250700000000',
    supportEmail: 'support@skignas.com',
    supportPhone: '+225 01 41 00 00 12',
};
/** Coordonnées de contact réelles (SiteSettings), avec repli si indisponible. */
async function getContactInfo() {
    try {
        const s = await prisma_1.prisma.siteSettings.findUnique({ where: { id: 1 } });
        if (!s)
            return DEFAULTS;
        return { whatsappNumber: s.whatsappNumber, supportEmail: s.supportEmail, supportPhone: s.supportPhone };
    }
    catch {
        return DEFAULTS;
    }
}
function waLink(whatsappNumber, text) {
    const base = `https://wa.me/${whatsappNumber}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
//# sourceMappingURL=settings.js.map