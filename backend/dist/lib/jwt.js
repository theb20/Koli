"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.signMagicToken = signMagicToken;
exports.verifyMagicToken = verifyMagicToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET ?? 'koli-dev-secret-key';
const EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
/** Génère un access token (courte durée) */
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: EXPIRES });
}
/** Génère un refresh token (longue durée) */
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET + '_refresh', { expiresIn: REFRESH_EXPIRES });
}
/** Vérifie et décode un access token */
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
/** Vérifie et décode un refresh token */
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET + '_refresh');
}
/** Génère un magic-link token (15 min) */
function signMagicToken(userId, email) {
    return jsonwebtoken_1.default.sign({ userId, email, type: 'magic' }, SECRET + '_magic', { expiresIn: '15m' });
}
/** Vérifie un magic-link token */
function verifyMagicToken(token) {
    return jsonwebtoken_1.default.verify(token, SECRET + '_magic');
}
//# sourceMappingURL=jwt.js.map