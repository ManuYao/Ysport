"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const PointTransaction_1 = __importDefault(require("../models/PointTransaction"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const POINT_VALUES = {
    session: 20,
    sessionWithTimer: 45,
    eventCreated: 120,
    eventJoined: 30,
    presenceOnVenue: 10,
    reviewPosted: 15,
    streakBonus: 50,
};
const REASON_LABELS = {
    session: 'Session sportive',
    sessionWithTimer: 'Session avec timer',
    eventCreated: 'Événement organisé',
    eventJoined: 'Événement rejoint',
    presenceOnVenue: 'Présence sur lieu',
    reviewPosted: 'Avis publié',
    streakBonus: 'Bonus streak',
};
const REASON_ICONS = {
    session: '🏃',
    sessionWithTimer: '🔥',
    eventCreated: '🎯',
    eventJoined: '🤝',
    presenceOnVenue: '📍',
    reviewPosted: '⭐',
    streakBonus: '🔥',
};
// GET /api/user/profile
router.get('/profile', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await User_1.default.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: 'Utilisateur introuvable' });
            return;
        }
        const level = user.getLevel();
        // Historique des 10 dernières transactions
        const transactions = await PointTransaction_1.default.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(10);
        // Stats globales
        const allTx = await PointTransaction_1.default.find({ userId: req.userId });
        const sessionCount = allTx.filter(t => t.reason === 'session' || t.reason === 'sessionWithTimer').length;
        const eventCount = allTx.filter(t => t.reason === 'eventJoined' || t.reason === 'eventCreated').length;
        // Activité formatée
        const activity = transactions.map(t => ({
            id: String(t._id),
            icon: REASON_ICONS[t.reason] ?? '⚡',
            iconBg: '#C9A84C15',
            title: t.label ?? REASON_LABELS[t.reason] ?? t.reason,
            sub: timeAgo(t.createdAt),
            pts: t.amount,
        }));
        // Badges dynamiques basés sur l'activité
        const badges = computeBadges(user, allTx.length, sessionCount, eventCount);
        res.json({
            user: {
                id: String(user._id),
                name: user.name,
                handle: user.handle,
                initial: user.initial,
                level: level.name,
                levelIcon: level.icon,
                points: user.points,
                nextLevelPoints: level.next,
                sports: user.sports,
            },
            stats: {
                sessions: sessionCount,
                events: eventCount,
                points: user.points,
                badges: badges.filter(b => b.earned).length,
            },
            badges,
            activity,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// POST /api/user/points
router.post('/points', auth_1.requireAuth, async (req, res) => {
    try {
        const { reason, spotId, eventId, label } = req.body;
        if (!reason || !POINT_VALUES[reason]) {
            res.status(400).json({ error: 'reason invalide' });
            return;
        }
        const amount = POINT_VALUES[reason];
        await PointTransaction_1.default.create({ userId: req.userId, amount, reason, spotId, eventId, label });
        const updated = await User_1.default.findByIdAndUpdate(req.userId, { $inc: { points: amount } }, { new: true });
        if (!updated) {
            res.status(404).json({ error: 'Utilisateur introuvable' });
            return;
        }
        const level = updated.getLevel();
        res.json({ points: updated.points, level: level.name, levelIcon: level.icon, earned: amount });
    }
    catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});
// ─── Helpers ──────────────────────────────────────────────
function timeAgo(date) {
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(min / 60);
    const d = Math.floor(h / 24);
    if (d >= 7)
        return `Il y a ${Math.floor(d / 7)} sem.`;
    if (d >= 1)
        return `Il y a ${d}j`;
    if (h >= 1)
        return `Il y a ${h}h`;
    return `Il y a ${min} min`;
}
function computeBadges(user, txCount, sessionCount, eventCount) {
    return [
        { id: 'b-org', icon: '🏆', name: 'Organisateur', earned: eventCount >= 1 },
        { id: 'b-streak', icon: '🔥', name: '7j de suite', earned: txCount >= 7 },
        { id: 'b-hiit', icon: '⚡', name: 'HIIT Master', earned: sessionCount >= 5 },
        { id: 'b-runner', icon: '🏃', name: 'Runner', earned: user.sports.includes('running') && sessionCount >= 3 },
        { id: 'b-events', icon: '🎯', name: '10 events', earned: eventCount >= 10 },
        { id: 'b-elite', icon: '👑', name: 'Elite', earned: user.points >= 2500 },
        { id: 'b-explorer', icon: '🌍', name: '5 villes', earned: false },
    ];
}
exports.default = router;
