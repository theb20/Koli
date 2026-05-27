"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../lib/jwt");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const mailer_1 = require("../lib/mailer");
const router = (0, express_1.Router)();
/* ── Schemas ─────────────────────────────────────────────────── */
const registerSchema = zod_1.z.object({
    prenom: zod_1.z.string().min(2, 'Prénom trop court').max(50),
    nom: zod_1.z.string().min(2, 'Nom trop court').max(50),
    email: zod_1.z.string().email('Email invalide'),
    password: validate_1.zPassword,
    telephone: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1, 'Mot de passe requis'),
});
const updateProfileSchema = zod_1.z.object({
    prenom: zod_1.z.string().min(2).max(50).optional(),
    nom: zod_1.z.string().min(2).max(50).optional(),
    telephone: zod_1.z.string().optional(),
    genre: zod_1.z.enum(['Homme', 'Femme', 'Autre']).optional(),
    naissance: zod_1.z.string().optional(),
    avatar: zod_1.z.string().url().optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: validate_1.zPassword,
});
/* ── Helpers ─────────────────────────────────────────────────── */
function setAuthCookies(res, accessToken, refreshToken) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
        httpOnly: true, secure: isProd, sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7j
    });
    res.cookie('refresh_token', refreshToken, {
        httpOnly: true, secure: isProd, sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30j
    });
}
/* ─────────────────────────────────────────────────────────────
   POST /api/auth/register
───────────────────────────────────────────────────────────── */
router.post('/register', (0, validate_1.validate)(registerSchema), async (req, res) => {
    try {
        const { prenom, nom, email, password, telephone } = req.body;
        const exists = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (exists) {
            res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email' });
            return;
        }
        const hashed = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { prenom, nom, email, password: hashed, telephone },
        });
        const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id, email: user.email, role: user.role });
        const refreshToken = (0, jwt_1.signRefreshToken)({ userId: user.id });
        await prisma_1.prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        // Email de bienvenue (sans bloquer la réponse)
        (0, mailer_1.sendWelcomeEmail)(email, prenom).catch(() => { });
        setAuthCookies(res, accessToken, refreshToken);
        res.status(201).json({
            success: true,
            message: 'Compte créé avec succès',
            data: {
                user: { id: user.id, prenom, nom, email, role: user.role },
                accessToken,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/auth/login
───────────────────────────────────────────────────────────── */
router.post('/login', (0, validate_1.validate)(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
            return;
        }
        const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id, email: user.email, role: user.role });
        const refreshToken = (0, jwt_1.signRefreshToken)({ userId: user.id });
        await prisma_1.prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        setAuthCookies(res, accessToken, refreshToken);
        res.json({
            success: true,
            data: {
                user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, avatar: user.avatar },
                accessToken,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/auth/refresh
───────────────────────────────────────────────────────────── */
router.post('/refresh', async (req, res) => {
    try {
        const token = req.cookies?.refresh_token ?? req.body?.refreshToken;
        if (!token) {
            res.status(401).json({ success: false, message: 'Refresh token manquant' });
            return;
        }
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        const session = await prisma_1.prisma.session.findUnique({ where: { refreshToken: token } });
        if (!session || session.expiresAt < new Date()) {
            res.status(401).json({ success: false, message: 'Session expirée, reconnectez-vous' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
            res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
            return;
        }
        const newAccessToken = (0, jwt_1.signAccessToken)({ userId: user.id, email: user.email, role: user.role });
        const newRefreshToken = (0, jwt_1.signRefreshToken)({ userId: user.id });
        await prisma_1.prisma.session.update({
            where: { id: session.id },
            data: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        });
        setAuthCookies(res, newAccessToken, newRefreshToken);
        res.json({ success: true, data: { accessToken: newAccessToken } });
    }
    catch {
        res.status(401).json({ success: false, message: 'Refresh token invalide' });
    }
});
/* ─────────────────────────────────────────────────────────────
   POST /api/auth/logout
───────────────────────────────────────────────────────────── */
router.post('/logout', auth_1.requireAuth, async (req, res) => {
    try {
        const token = req.cookies?.refresh_token;
        if (token) {
            await prisma_1.prisma.session.deleteMany({ where: { refreshToken: token } });
        }
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.json({ success: true, message: 'Déconnexion réussie' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/auth/me
───────────────────────────────────────────────────────────── */
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true, prenom: true, nom: true, email: true,
                telephone: true, avatar: true, genre: true, naissance: true,
                role: true, isVerified: true, createdAt: true,
                _count: { select: { orders: true, wishlist: true, reviews: true } },
            },
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/profile
───────────────────────────────────────────────────────────── */
router.put('/profile', auth_1.requireAuth, (0, validate_1.validate)(updateProfileSchema), async (req, res) => {
    try {
        const data = req.body;
        const updated = await prisma_1.prisma.user.update({
            where: { id: req.user.userId },
            data: {
                ...data,
                naissance: data.naissance ? new Date(data.naissance) : undefined,
            },
            select: { id: true, prenom: true, nom: true, email: true, telephone: true, avatar: true, genre: true, naissance: true },
        });
        res.json({ success: true, message: 'Profil mis à jour', data: updated });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   PUT /api/auth/password
───────────────────────────────────────────────────────────── */
router.put('/password', auth_1.requireAuth, (0, validate_1.validate)(changePasswordSchema), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!valid) {
            res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
            return;
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
        // Révoque toutes les sessions sauf l'actuelle
        const currentRefresh = req.cookies?.refresh_token;
        await prisma_1.prisma.session.deleteMany({
            where: { userId: user.id, NOT: { refreshToken: currentRefresh ?? '' } },
        });
        res.json({ success: true, message: 'Mot de passe modifié avec succès' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   GET /api/auth/sessions
───────────────────────────────────────────────────────────── */
router.get('/sessions', auth_1.requireAuth, async (req, res) => {
    try {
        const sessions = await prisma_1.prisma.session.findMany({
            where: { userId: req.user.userId, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, userAgent: true, ipAddress: true, createdAt: true },
        });
        res.json({ success: true, data: sessions });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
/* ─────────────────────────────────────────────────────────────
   DELETE /api/auth/sessions/:id
───────────────────────────────────────────────────────────── */
router.delete('/sessions/:id', auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.prisma.session.deleteMany({
            where: { id: req.params['id'], userId: req.user.userId },
        });
        res.json({ success: true, message: 'Session révoquée' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map