"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function makeToken(userId) {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}
function safeUser(u) {
    const level = u.getLevel();
    return {
        id: u._id,
        name: u.name,
        handle: u.handle,
        initial: u.initial,
        email: u.email,
        points: u.points,
        sports: u.sports,
        badges: u.badges,
        level: level.name,
        levelIcon: level.icon,
        nextLevelPoints: level.next,
    };
}
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, sports = [] } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({ error: 'email, password et name sont requis' });
            return;
        }
        const exists = await User_1.default.findOne({ email });
        if (exists) {
            res.status(409).json({ error: 'Email déjà utilisé' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const handle = '@' + name.toLowerCase().replace(/\s+/g, '').slice(0, 15) + Math.floor(Math.random() * 999);
        const initial = name.trim()[0].toUpperCase();
        const user = await User_1.default.create({ email, passwordHash, name, handle, initial, sports, points: 0, badges: [] });
        const token = makeToken(String(user._id));
        res.status(201).json({ token, user: safeUser(user) });
    }
    catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'email et password requis' });
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Identifiants incorrects' });
            return;
        }
        const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!ok) {
            res.status(401).json({ error: 'Identifiants incorrects' });
            return;
        }
        const token = makeToken(String(user._id));
        res.json({ token, user: safeUser(user) });
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// GET /api/auth/me
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: 'Utilisateur introuvable' });
            return;
        }
        res.json({ user: safeUser(user) });
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
exports.default = router;
