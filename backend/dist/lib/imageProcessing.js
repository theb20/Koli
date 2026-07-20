"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWebp = toWebp;
const sharp_1 = __importDefault(require("sharp"));
/**
 * Convertit n'importe quelle image (jpeg, png, heic/heif, gif animé, webp…)
 * en WebP — format unique de stockage pour tous les uploads du site.
 * `.rotate()` sans argument applique l'orientation EXIF puis la retire,
 * indispensable pour les photos prises depuis un téléphone.
 */
async function toWebp(input, quality = 82) {
    return (0, sharp_1.default)(input, { animated: true })
        .rotate()
        .webp({ quality })
        .toBuffer();
}
//# sourceMappingURL=imageProcessing.js.map