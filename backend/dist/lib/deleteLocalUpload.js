"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLocalUpload = deleteLocalUpload;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const UPLOAD_DIR = path_1.default.resolve(process.env.UPLOAD_DIR ?? './uploads');
/**
 * Supprime un fichier physique préalablement uploadé (image de catégorie,
 * produit ré-hébergé...) si l'URL pointe bien dans notre propre dossier
 * uploads/ — ignore silencieusement les URLs externes (rien à supprimer).
 */
function deleteLocalUpload(url) {
    const marker = '/uploads/';
    const idx = url.indexOf(marker);
    if (idx === -1)
        return;
    const relativePath = url.slice(idx + marker.length);
    const fullPath = path_1.default.resolve(UPLOAD_DIR, relativePath);
    // Défense en profondeur contre un éventuel path traversal (../..)
    if (!fullPath.startsWith(UPLOAD_DIR))
        return;
    if (fs_1.default.existsSync(fullPath))
        fs_1.default.unlinkSync(fullPath);
}
//# sourceMappingURL=deleteLocalUpload.js.map